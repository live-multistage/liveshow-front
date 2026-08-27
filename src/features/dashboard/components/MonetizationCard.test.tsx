import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AdPartnershipStatus } from '@/features/ad-partner/types/ad-partner.types';
import { MonetizationCard } from './MonetizationCard';

const state = {
  data: {
    liveViews: 500, payingBuyers: 10,
    thresholds: { minLiveViews: 1000, minPayingBuyers: 50 },
    windowDays: 90, eligible: false, connectReady: true,
    status: 'NOT_ELIGIBLE' as AdPartnershipStatus, revenueShareRate: 0.55, reviewNote: null as string | null,
    earnings: [] as { day: string; amount: number; currency: string; grossCents: number; rate: number }[],
  },
  isLoading: false,
};

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('@/features/ad-partner/queries/use-ad-partnership', () => ({
  useAdPartnershipQuery: () => state,
  useApplyForPartnershipMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('MonetizationCard', () => {
  it('shows progress against both thresholds', () => {
    render(<MonetizationCard organizationId="org-1" />);
    expect(screen.getByText('500 / 1000')).toBeInTheDocument();
    expect(screen.getByText('10 / 50')).toBeInTheDocument();
  });

  it('disables Apply until the org is eligible', () => {
    render(<MonetizationCard organizationId="org-1" />);
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  it('shows a hint explaining why Apply is disabled when not eligible but Connect is ready', () => {
    render(<MonetizationCard organizationId="org-1" />);
    expect(screen.getByText('applyHint')).toBeInTheDocument();
  });

  it('enables Apply once eligible with Connect ready', () => {
    state.data = { ...state.data, eligible: true, liveViews: 1200, payingBuyers: 60, status: 'ELIGIBLE' };
    render(<MonetizationCard organizationId="org-1" />);
    expect(screen.getByRole('button', { name: /apply/i })).toBeEnabled();
  });

  it('shows the effective rate and earnings once approved', () => {
    state.data = {
      ...state.data, status: 'APPROVED', revenueShareRate: 0.6,
      earnings: [{ day: '2026-08-26', amount: 67.9, currency: 'BRL', grossCents: 12345, rate: 0.6 }],
    };
    render(<MonetizationCard organizationId="org-1" />);
    expect(screen.getByText(/60%/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?67,90/)).toBeInTheDocument();
  });
});
