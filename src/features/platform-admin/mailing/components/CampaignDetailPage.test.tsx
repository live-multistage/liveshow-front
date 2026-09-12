vi.mock('next-intl', () => ({ useTranslations: () => (key: string, vars?: Record<string, unknown>) => (vars ? `${key} ${JSON.stringify(vars)}` : key) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../queries/mailing.queries', () => ({ useMailingCampaignQuery: vi.fn(), useAudienceCountQuery: vi.fn() }));
vi.mock('../mutations/mailing.mutations', () => ({ useCancelMailingCampaignMutation: vi.fn(), useDispatchMailingCampaignMutation: vi.fn() }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignDetailPage } from './CampaignDetailPage';
import { useAudienceCountQuery, useMailingCampaignQuery } from '../queries/mailing.queries';
import { useCancelMailingCampaignMutation, useDispatchMailingCampaignMutation } from '../mutations/mailing.mutations';

const detail = {
  id: 'c1', name: 'Outubro', templateId: 't1', templateName: 'Promo', audience: { type: 'ALL_VERIFIED' }, status: 'SENDING',
  scheduledAt: null, startedAt: '', finishedAt: null, totalRecipients: 1000, sentCount: 400, skippedCount: 130, failedCount: 2, createdAt: '',
  category: 'MARKETING', subject: 'Oi', dailyCap: 60,
  breakdown: { pending: 468, sending: 0, sent: 400, failed: 2, skippedOptedOut: 120, skippedUnverified: 10, skippedDeleted: 0, skippedCancelled: 0 },
};
const cancel = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMailingCampaignQuery).mockReturnValue({ data: detail, isLoading: false } as never);
  vi.mocked(useAudienceCountQuery).mockReturnValue({ data: undefined, isLoading: false } as never);
  vi.mocked(useCancelMailingCampaignMutation).mockReturnValue({ mutate: cancel, isPending: false } as never);
  vi.mocked(useDispatchMailingCampaignMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
});

describe('CampaignDetailPage', () => {
  it('shows progress, counters by reason and the ETA from remaining ÷ cap', () => {
    render(<CampaignDetailPage campaignId="c1" />);
    expect(screen.getByText('detail.progress {"sent":400,"total":1000}')).toBeInTheDocument();
    expect(screen.getByText('detail.skippedOptedOut').nextSibling).toHaveTextContent('120');
    expect(screen.getByText('detail.eta {"days":8}')).toBeInTheDocument(); // ceil(468 / 60)
  });

  it('cancels only after confirmation', async () => {
    render(<CampaignDetailPage campaignId="c1" />);
    await userEvent.click(screen.getByRole('button', { name: 'detail.cancel' }));
    expect(cancel).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'detail.cancelConfirm' }));
    expect(cancel).toHaveBeenCalledWith('c1', expect.anything());
  });

  it('hides cancel once the campaign is finished', () => {
    vi.mocked(useMailingCampaignQuery).mockReturnValue({ data: { ...detail, status: 'SENT' }, isLoading: false } as never);
    render(<CampaignDetailPage campaignId="c1" />);
    expect(screen.queryByRole('button', { name: 'detail.cancel' })).toBeNull();
  });

  it('shows the preparing state with no bar and no ETA while the total is unknown', () => {
    vi.mocked(useMailingCampaignQuery).mockReturnValue({ data: { ...detail, totalRecipients: null }, isLoading: false } as never);
    render(<CampaignDetailPage campaignId="c1" />);
    expect(screen.getByText('detail.materializing')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText(/detail\.eta/)).toBeNull();
  });

  it('clamps progress and drops the ETA when counters overshoot the total', () => {
    vi.mocked(useMailingCampaignQuery).mockReturnValue({ data: { ...detail, sentCount: 1100, skippedCount: 0, failedCount: 0 }, isLoading: false } as never);
    render(<CampaignDetailPage campaignId="c1" />);
    expect(screen.getByText('detail.progress {"sent":1000,"total":1000}')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1000');
    expect(screen.queryByText(/detail\.eta/)).toBeNull();
  });
});
