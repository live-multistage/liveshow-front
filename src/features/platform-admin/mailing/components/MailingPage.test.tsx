vi.mock('next-intl', () => ({ useTranslations: () => (key: string, vars?: Record<string, unknown>) => (vars ? `${key} ${JSON.stringify(vars)}` : key) }));
const replace = vi.fn();
let search = new URLSearchParams();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }), useSearchParams: () => search, usePathname: () => '/dashboard/platform/mailing' }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../queries/mailing.queries', () => ({ useMailingTemplatesQuery: vi.fn(), useMailingCampaignsQuery: vi.fn() }));
vi.mock('../mutations/mailing.mutations', () => ({ useDuplicateMailingTemplateMutation: vi.fn(), useArchiveMailingTemplateMutation: vi.fn() }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MailingPage } from './MailingPage';
import { useMailingCampaignsQuery, useMailingTemplatesQuery } from '../queries/mailing.queries';
import { useArchiveMailingTemplateMutation, useDuplicateMailingTemplateMutation } from '../mutations/mailing.mutations';

const templates = [
  { id: 't1', name: 'Promo outubro', category: 'MARKETING', language: 'pt', version: 3, lastTestedVersion: 3, updatedAt: '2026-09-10T12:00:00Z' },
  { id: 't2', name: 'Aviso', category: 'ANNOUNCEMENT', language: 'pt', version: 2, lastTestedVersion: 1, updatedAt: '2026-09-11T12:00:00Z' },
];
const campaigns = [{
  id: 'c1', name: 'Outubro', templateId: 't1', templateName: 'Promo outubro', audience: { type: 'ALL_VERIFIED' }, status: 'SENDING',
  scheduledAt: null, startedAt: '2026-09-12T12:00:00Z', finishedAt: null, totalRecipients: 850, sentCount: 60, skippedCount: 120, failedCount: 0, createdAt: '2026-09-12T11:00:00Z',
}];
const archive = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  search = new URLSearchParams();
  vi.mocked(useMailingTemplatesQuery).mockReturnValue({ data: templates, isLoading: false, isError: false } as never);
  vi.mocked(useMailingCampaignsQuery).mockReturnValue({ data: campaigns, isLoading: false, isError: false } as never);
  vi.mocked(useDuplicateMailingTemplateMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useArchiveMailingTemplateMutation).mockReturnValue({ mutate: archive, isPending: false } as never);
});

describe('MailingPage', () => {
  it('lists templates with category and tested badges', () => {
    render(<MailingPage />);
    const row = screen.getByText('Promo outubro').closest('tr')!;
    expect(within(row).getByText('category.MARKETING')).toBeInTheDocument();
    expect(within(row).getByText('templates.tested')).toBeInTheDocument();
    expect(within(screen.getByText('Aviso').closest('tr')!).getByText('templates.untested')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'templates.new' })).toHaveAttribute('href', '/dashboard/platform/mailing/templates/new');
  });

  it('archives only after confirmation', async () => {
    render(<MailingPage />);
    await userEvent.click(within(screen.getByText('Aviso').closest('tr')!).getByRole('button', { name: 'templates.archive' }));
    expect(archive).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(archive).toHaveBeenCalledWith('t2', expect.anything());
  });

  it('switches to campaigns via ?tab=campaigns and shows progress', async () => {
    render(<MailingPage />);
    await userEvent.click(screen.getByRole('tab', { name: 'page.tabCampaigns' }));
    expect(replace).toHaveBeenCalledWith('/dashboard/platform/mailing?tab=campaigns');
  });

  it('renders the campaigns table when the tab param says so', () => {
    search = new URLSearchParams('tab=campaigns');
    render(<MailingPage />);
    const row = screen.getByText('Outubro').closest('tr')!;
    expect(within(row).getByText('campaigns.status.SENDING')).toBeInTheDocument();
    expect(within(row).getByText('campaigns.progress {"sent":60,"total":850}')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Outubro' })).toHaveAttribute('href', '/dashboard/platform/mailing/campaigns/c1');
  });
});
