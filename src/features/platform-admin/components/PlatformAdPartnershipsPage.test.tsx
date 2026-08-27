import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
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
  beforeEach(() => {
    mutate.mockClear();
  });

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

  it('opens a note dialog for reject and calls the mutation with the note on confirm', async () => {
    const user = userEvent.setup();
    render(<PlatformAdPartnershipsPage />);

    await user.click(screen.getByRole('button', { name: 'reject' }));
    expect(screen.getByText('noteDialogTitle')).toBeInTheDocument();

    // Confirm is disabled until a note is entered.
    expect(screen.getByRole('button', { name: 'confirm' })).toBeDisabled();

    await user.type(screen.getByPlaceholderText('notePlaceholder'), 'Missing required documents');
    await user.click(screen.getByRole('button', { name: 'confirm' }));

    expect(mutate).toHaveBeenCalledWith(
      { id: 'p1', action: 'reject', note: 'Missing required documents' },
      expect.anything(),
    );
    expect(screen.queryByText('noteDialogTitle')).not.toBeInTheDocument();
  });

  it('closes the note dialog without mutating on cancel', async () => {
    const user = userEvent.setup();
    render(<PlatformAdPartnershipsPage />);

    await user.click(screen.getByRole('button', { name: 'reject' }));
    await user.type(screen.getByPlaceholderText('notePlaceholder'), 'draft note');
    await user.click(screen.getByRole('button', { name: 'cancel' }));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.queryByText('noteDialogTitle')).not.toBeInTheDocument();
  });
});
