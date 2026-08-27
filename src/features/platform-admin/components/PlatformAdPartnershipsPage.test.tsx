import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdPartnershipsPage } from './PlatformAdPartnershipsPage';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('./PlatformPageShell', () => ({
  PlatformPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
const mutate = vi.fn();
vi.mock('@/features/ad-partner/queries/use-ad-partnership', () => ({
  useAdPartnershipsQuery: () => ({
    data: [
      {
        id: 'p1', organizationId: 'org-1', status: 'APPLIED', revenueShareRate: null,
        metricsSnapshot: { liveViews: 5000, payingBuyers: 120, windowDays: 90, capturedAt: 'x' },
        appliedAt: '2026-08-20T00:00:00Z', reviewedAt: null, reviewedBy: null, reviewNote: null,
      },
    ],
    isLoading: false,
  }),
  useReviewPartnershipMutation: () => ({ mutate }),
  useSetPartnershipRateMutation: () => ({ mutate: vi.fn() }),
}));

describe('PlatformAdPartnershipsPage', () => {
  it('lists applications with approve and reject actions', () => {
    render(<PlatformAdPartnershipsPage />);
    expect(screen.getByText('org-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'reject' })).toBeInTheDocument();
  });

  it('offers a per-org rate override input', () => {
    render(<PlatformAdPartnershipsPage />);
    expect(screen.getByLabelText('rateFor')).toBeInTheDocument();
  });
});
