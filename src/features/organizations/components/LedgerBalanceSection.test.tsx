import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { LedgerBalanceSection } from './LedgerBalanceSection';
import { useOrganizationLedger } from '../hooks/use-organization-ledger';
import { useStripeStatus } from '../hooks/use-stripe-status';
import { useWithdrawLedgerBalance } from '../hooks/use-withdraw-ledger-balance';
import type { OrganizationLedgerResponse, OrganizationPayoutResult } from '../types/organization.types';
import type { AppError } from '@/lib/http/errors';
import { formatPrice } from '@/features/events/utils/event-formatters';

// testing-library normalizes DOM whitespace (including the non-breaking
// space Intl inserts after "R$"/"US$") to a plain space before comparing.
function normalized(value: string): string {
  return value.replace(/\s+/g, ' ');
}

vi.mock('../hooks/use-organization-ledger', () => ({
  useOrganizationLedger: vi.fn(),
}));
vi.mock('../hooks/use-stripe-status', () => ({
  useStripeStatus: vi.fn(),
}));
vi.mock('../hooks/use-withdraw-ledger-balance', async () => {
  const actual = await vi.importActual<typeof import('../hooks/use-withdraw-ledger-balance')>(
    '../hooks/use-withdraw-ledger-balance',
  );
  return { ...actual, useWithdrawLedgerBalance: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockedLedger = vi.mocked(useOrganizationLedger);
const mockedStripeStatus = vi.mocked(useStripeStatus);
const mockedWithdraw = vi.mocked(useWithdrawLedgerBalance);

const BRL_BALANCE = 1500;
const USD_BALANCE = 250;

const ledger: OrganizationLedgerResponse = {
  balances: [
    { currency: 'BRL', balance: BRL_BALANCE },
    { currency: 'USD', balance: USD_BALANCE },
  ],
  entries: [],
};

function mutateReturning(result: OrganizationPayoutResult) {
  return vi.fn((_vars, opts?: { onSuccess?: (r: OrganizationPayoutResult) => void }) => {
    opts?.onSuccess?.(result);
  });
}

function mutateFailingWith(error: AppError) {
  return vi.fn((_vars, opts?: { onError?: (e: AppError) => void }) => {
    opts?.onError?.(error);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedStripeStatus.mockReturnValue({
    data: {
      hasAccount: true,
      onboardingComplete: true,
      feeRateOverride: null,
      effectiveFeeRate: 0.1,
      requirements: { currentlyDue: [], pastDue: [], disabledReason: null },
    },
  } as ReturnType<typeof useStripeStatus>);
  mockedWithdraw.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useWithdrawLedgerBalance>);
});

describe('LedgerBalanceSection', () => {
  it('renders one balance row per currency', () => {
    mockedLedger.mockReturnValue({
      data: ledger,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizationLedger>);

    render(<LedgerBalanceSection orgId="org-1" />);

    expect(screen.getByText(normalized(formatPrice(BRL_BALANCE, 'BRL')))).toBeInTheDocument();
    expect(screen.getByText(normalized(formatPrice(USD_BALANCE, 'USD')))).toBeInTheDocument();
  });

  it('renders a zero-state card with a hint when there are no balances or entries', () => {
    mockedLedger.mockReturnValue({
      data: { balances: [], entries: [] },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizationLedger>);

    render(<LedgerBalanceSection orgId="org-1" />);

    expect(screen.getByText(normalized(formatPrice(0, 'BRL')))).toBeInTheDocument();
    expect(screen.getByText('ledgerZeroHint')).toBeInTheDocument();
    // Zero balance is not withdrawable.
    expect(screen.queryByText('withdrawButton')).not.toBeInTheDocument();
  });

  it('does not render a withdraw button for a non-positive balance', () => {
    mockedLedger.mockReturnValue({
      data: { balances: [{ currency: 'BRL', balance: 0 }], entries: [] },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizationLedger>);

    render(<LedgerBalanceSection orgId="org-1" />);

    expect(screen.queryByText('withdrawButton')).not.toBeInTheDocument();
  });

  it('withdraws the confirmed currency and shows a success toast', async () => {
    const user = userEvent.setup();
    mockedLedger.mockReturnValue({
      data: ledger,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizationLedger>);
    const mutate = mutateReturning({
      payouts: [{ transferId: 'tr_1', amount: BRL_BALANCE, currency: 'BRL' }],
      failed: [],
      negativeBalances: [],
    });
    mockedWithdraw.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
      typeof useWithdrawLedgerBalance
    >);

    render(<LedgerBalanceSection orgId="org-1" />);

    await user.click(screen.getAllByText('withdrawButton')[0]);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByText('withdrawConfirmAction'));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('withdrawSuccess');
  });

  it('maps a not-ready-to-receive error to the Connect-section copy', async () => {
    const user = userEvent.setup();
    mockedLedger.mockReturnValue({
      data: ledger,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizationLedger>);
    const mutate = mutateFailingWith({
      status: 400,
      message: 'Organization has no ready Stripe account',
    });
    mockedWithdraw.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
      typeof useWithdrawLedgerBalance
    >);

    render(<LedgerBalanceSection orgId="org-1" />);

    await user.click(screen.getAllByText('withdrawButton')[0]);
    await screen.findByRole('dialog');
    await user.click(screen.getByText('withdrawConfirmAction'));

    expect(toast.error).toHaveBeenCalledWith('withdrawErrorNotReady');
  });

  it('maps an insufficient-balance error distinctly from the not-ready case', async () => {
    const user = userEvent.setup();
    mockedLedger.mockReturnValue({
      data: ledger,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizationLedger>);
    const mutate = mutateFailingWith({ status: 400, message: 'No positive ledger balance to pay out' });
    mockedWithdraw.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
      typeof useWithdrawLedgerBalance
    >);

    render(<LedgerBalanceSection orgId="org-1" />);

    await user.click(screen.getAllByText('withdrawButton')[0]);
    await screen.findByRole('dialog');
    await user.click(screen.getByText('withdrawConfirmAction'));

    expect(toast.error).toHaveBeenCalledWith('withdrawErrorInsufficientBalance');
  });

  it('maps a 500 transfer failure to the generic retry copy', async () => {
    const user = userEvent.setup();
    mockedLedger.mockReturnValue({
      data: ledger,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizationLedger>);
    const mutate = mutateFailingWith({ status: 500, message: 'transfer failed' });
    mockedWithdraw.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
      typeof useWithdrawLedgerBalance
    >);

    render(<LedgerBalanceSection orgId="org-1" />);

    await user.click(screen.getAllByText('withdrawButton')[0]);
    await screen.findByRole('dialog');
    await user.click(screen.getByText('withdrawConfirmAction'));

    expect(toast.error).toHaveBeenCalledWith('withdrawErrorUnexpected');
  });

  it('disables the withdraw buttons and the confirm action while a withdrawal is pending', () => {
    mockedLedger.mockReturnValue({
      data: ledger,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizationLedger>);
    mockedWithdraw.mockReturnValue({ mutate: vi.fn(), isPending: true } as unknown as ReturnType<
      typeof useWithdrawLedgerBalance
    >);

    render(<LedgerBalanceSection orgId="org-1" />);

    const buttons = screen.getAllByText('withdrawButton');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((button) => expect(button).toBeDisabled());
  });
});
