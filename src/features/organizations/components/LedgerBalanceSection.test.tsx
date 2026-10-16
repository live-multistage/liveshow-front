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
    { currency: 'BRL', balance: BRL_BALANCE, available: BRL_BALANCE, pending: 0 },
    { currency: 'USD', balance: USD_BALANCE, available: USD_BALANCE, pending: 0 },
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
      data: { balances: [{ currency: 'BRL', balance: 0, available: 0, pending: 0 }], entries: [] },
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

  describe('settlement hold', () => {
    const AVAILABLE = 400;
    const PENDING = 600;
    const held: OrganizationLedgerResponse = {
      balances: [{ currency: 'BRL', balance: AVAILABLE + PENDING, available: AVAILABLE, pending: PENDING }],
      entries: [],
    };

    function renderLedger(data: OrganizationLedgerResponse) {
      mockedLedger.mockReturnValue({
        data,
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useOrganizationLedger>);
      render(<LedgerBalanceSection orgId="org-1" />);
    }

    it('shows the withdrawable amount, not the total balance, and flags the pending part', () => {
      renderLedger(held);

      expect(screen.getByText(normalized(formatPrice(AVAILABLE, 'BRL')))).toBeInTheDocument();
      expect(screen.queryByText(normalized(formatPrice(AVAILABLE + PENDING, 'BRL')))).not.toBeInTheDocument();
      expect(screen.getByText('ledgerPendingLabel')).toBeInTheDocument();
      expect(screen.getByText('ledgerPendingHint')).toBeInTheDocument();
    });

    it('offers no withdraw when everything is still pending', () => {
      renderLedger({
        balances: [{ currency: 'BRL', balance: PENDING, available: 0, pending: PENDING }],
        entries: [],
      });

      expect(screen.queryByText('withdrawButton')).not.toBeInTheDocument();
      expect(screen.getByText('ledgerPendingLabel')).toBeInTheDocument();
    });

    it('hides the pending line when nothing is held', () => {
      renderLedger(ledger);

      expect(screen.queryByText('ledgerPendingLabel')).not.toBeInTheDocument();
      expect(screen.queryByText('ledgerPendingHint')).not.toBeInTheDocument();
    });

    it('explains a withdraw that paid nothing because the balance is still pending', async () => {
      const user = userEvent.setup();
      const mutate = mutateReturning({
        payouts: [],
        failed: [],
        negativeBalances: [],
        pendingBalances: [{ currency: 'BRL', pending: PENDING }],
      });
      mockedWithdraw.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
        typeof useWithdrawLedgerBalance
      >);
      renderLedger(held);

      await user.click(screen.getByText('withdrawButton'));
      await screen.findByRole('dialog');
      await user.click(screen.getByText('withdrawConfirmAction'));

      expect(toast.error).toHaveBeenCalledWith('withdrawErrorPending');
    });
  });

  describe('statement', () => {
    function entry(id: string, type: string, amount: number) {
      return {
        id,
        organizationId: 'org-1',
        type,
        amount,
        currency: 'BRL',
        orderId: null,
        paymentId: null,
        transferId: null,
        gross: null,
        buyerFee: null,
        commissionRate: null,
        commissionAmount: null,
        createdAt: '2026-10-01T12:00:00.000Z',
      } as OrganizationLedgerResponse['entries'][number];
    }

    it.each(['SALE', 'REFUND', 'PAYOUT', 'CLAWBACK', 'AD_REVENUE', 'DISPUTE'])(
      'labels a %s entry with its translation',
      (type) => {
        mockedLedger.mockReturnValue({
          data: { balances: ledger.balances, entries: [entry('e1', type, -10)] },
          isLoading: false,
          isError: false,
        } as ReturnType<typeof useOrganizationLedger>);

        render(<LedgerBalanceSection orgId="org-1" />);

        expect(screen.getByText(`ledger${type}`)).toBeInTheDocument();
      },
    );

    it('never shows a raw type the screen does not know yet', () => {
      mockedLedger.mockReturnValue({
        data: { balances: ledger.balances, entries: [entry('e1', 'SOMETHING_NEW', 5)] },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useOrganizationLedger>);

      render(<LedgerBalanceSection orgId="org-1" />);

      expect(screen.queryByText('SOMETHING_NEW')).not.toBeInTheDocument();
      expect(screen.getByText('ledgerOTHER')).toBeInTheDocument();
    });
  });
});
