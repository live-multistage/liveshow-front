import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
import { render, screen } from '@testing-library/react';
import { StripeConnectSection } from './StripeConnectSection';
import { useStripeStatus } from '../hooks/use-stripe-status';
import { useInitiateStripeConnect } from '../hooks/use-initiate-stripe-connect';
import type { StripeAccountStatus } from '../types/organization.types';

vi.mock('../hooks/use-stripe-status', () => ({ useStripeStatus: vi.fn() }));
vi.mock('../hooks/use-initiate-stripe-connect', () => ({ useInitiateStripeConnect: vi.fn() }));

const mockedStatus = vi.mocked(useStripeStatus);
const mockedConnect = vi.mocked(useInitiateStripeConnect);

function statusWith(overrides: Partial<StripeAccountStatus>): StripeAccountStatus {
  return {
    hasAccount: true,
    onboardingComplete: false,
    feeRateOverride: null,
    effectiveFeeRate: 0.1,
    requirements: { currentlyDue: [], pastDue: [], disabledReason: null },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedConnect.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useInitiateStripeConnect>);
});

describe('StripeConnectSection requirements panel', () => {
  it('does not render the panel when requirements are empty', () => {
    mockedStatus.mockReturnValue({
      data: statusWith({}),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStripeStatus>);

    render(<StripeConnectSection orgId="org-1" />);

    expect(screen.queryByTestId('stripe-requirements-panel')).not.toBeInTheDocument();
    expect(screen.getByText('Continuar configuração')).toBeInTheDocument();
  });

  it('does not render the panel when onboarding is already complete', () => {
    mockedStatus.mockReturnValue({
      data: statusWith({
        onboardingComplete: true,
        requirements: { currentlyDue: ['external_account'], pastDue: [], disabledReason: null },
      }),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStripeStatus>);

    render(<StripeConnectSection orgId="org-1" />);

    expect(screen.queryByTestId('stripe-requirements-panel')).not.toBeInTheDocument();
  });

  it('renders currentlyDue items with the generic headline', () => {
    mockedStatus.mockReturnValue({
      data: statusWith({
        requirements: {
          currentlyDue: ['individual.verification.document', 'external_account'],
          pastDue: [],
          disabledReason: null,
        },
      }),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStripeStatus>);

    render(<StripeConnectSection orgId="org-1" />);

    const panel = screen.getByTestId('stripe-requirements-panel');
    expect(panel).toHaveTextContent('stripeRequirementsTitle');
    expect(screen.getByText('stripeReqIdDocument')).toBeInTheDocument();
    expect(screen.getByText('stripeReqBankAccount')).not.toHaveAttribute('data-urgent');
  });

  it('highlights pastDue items separately from currentlyDue', () => {
    mockedStatus.mockReturnValue({
      data: statusWith({
        requirements: {
          currentlyDue: ['individual.verification.document', 'external_account'],
          pastDue: ['external_account'],
          disabledReason: null,
        },
      }),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStripeStatus>);

    render(<StripeConnectSection orgId="org-1" />);

    const pastDueItem = screen.getByText('stripeReqBankAccount');
    expect(pastDueItem).toHaveAttribute('data-urgent', 'true');
    // Not duplicated: only appears once even though it's in both arrays.
    expect(screen.getAllByText('stripeReqBankAccount')).toHaveLength(1);
    expect(screen.getByText('stripeReqIdDocument')).not.toHaveAttribute('data-urgent');
  });

  it('shows the mapped disabledReason as the panel headline when present', () => {
    mockedStatus.mockReturnValue({
      data: statusWith({
        requirements: {
          currentlyDue: ['external_account'],
          pastDue: ['external_account'],
          disabledReason: 'requirements.past_due',
        },
      }),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStripeStatus>);

    render(<StripeConnectSection orgId="org-1" />);

    expect(screen.getByText('stripeDisabledPastDue')).toBeInTheDocument();
  });

  it('falls back to a prettified code for unmapped requirements and disabledReason', () => {
    mockedStatus.mockReturnValue({
      data: statusWith({
        requirements: {
          currentlyDue: ['some.unmapped_code'],
          pastDue: [],
          disabledReason: 'rejected.other',
        },
      }),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStripeStatus>);

    render(<StripeConnectSection orgId="org-1" />);

    // rejected.* maps to a dedicated key, not the raw prettifier.
    expect(screen.getByText('stripeDisabledRejected')).toBeInTheDocument();
    expect(screen.getByText('Some Unmapped Code')).toBeInTheDocument();
  });

  it('points to the onboarding CTA via the hint text', () => {
    mockedStatus.mockReturnValue({
      data: statusWith({
        requirements: { currentlyDue: ['external_account'], pastDue: [], disabledReason: null },
      }),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStripeStatus>);

    render(<StripeConnectSection orgId="org-1" />);

    expect(screen.getByText('stripeRequirementsHint')).toBeInTheDocument();
    expect(screen.getByText('Continuar configuração')).toBeInTheDocument();
  });
});
