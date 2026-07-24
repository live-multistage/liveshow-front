import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
import { render, screen } from '@testing-library/react';
import { LedgerBalanceSection } from './LedgerBalanceSection';
import { useOrganizationLedger } from '../hooks/use-organization-ledger';
import { useStripeStatus } from '../hooks/use-stripe-status';
import type { OrganizationLedgerResponse } from '../types/organization.types';
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

const mockedLedger = vi.mocked(useOrganizationLedger);
const mockedStripeStatus = vi.mocked(useStripeStatus);

const BRL_BALANCE = 1500;
const USD_BALANCE = 250;

const ledger: OrganizationLedgerResponse = {
  balances: [
    { currency: 'BRL', balance: BRL_BALANCE },
    { currency: 'USD', balance: USD_BALANCE },
  ],
  entries: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedStripeStatus.mockReturnValue({
    data: { hasAccount: true, onboardingComplete: true, feeRateOverride: null, effectiveFeeRate: 0.1 },
  } as ReturnType<typeof useStripeStatus>);
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

  it('renders nothing when there are no balances and no entries', () => {
    mockedLedger.mockReturnValue({
      data: { balances: [], entries: [] },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useOrganizationLedger>);

    const { container } = render(<LedgerBalanceSection orgId="org-1" />);

    expect(container).toBeEmptyDOMElement();
  });
});
