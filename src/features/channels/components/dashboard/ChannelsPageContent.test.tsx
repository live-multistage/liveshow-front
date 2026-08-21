import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Channel } from '../../types/channel.types';
import { ChannelsPageContent } from './ChannelsPageContent';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const organizations = { data: [{ id: 'org-1', name: 'Org Um', slug: 'org-um' }] };
vi.mock('@/features/organizations/queries/get-my-organizations', () => ({
  useMyOrganizationsQuery: () => organizations,
}));

const useOrgChannelsQuery = vi.fn();
vi.mock('../../queries/channel.queries', () => ({
  useOrgChannelsQuery: (...args: unknown[]) => useOrgChannelsQuery(...args),
}));

const channel = (overrides: Partial<Channel> = {}): Channel =>
  ({
    id: 'ch-1',
    organizationId: 'org-1',
    slug: 'canal-um',
    name: 'Canal Um',
    description: null,
    coverUrl: null,
    accessMode: 'FREE',
    status: 'DRAFT',
    broadcastEventId: 'evt-1',
    timezone: 'America/Sao_Paulo',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }) as Channel;

describe('ChannelsPageContent', () => {
  beforeEach(() => {
    useOrgChannelsQuery.mockReset();
    useOrgChannelsQuery.mockReturnValue({ data: [channel()], isLoading: false });
  });

  it('lists the channels of the first organization, linking each to its detail page', () => {
    render(<ChannelsPageContent />);

    expect(useOrgChannelsQuery).toHaveBeenCalledWith('org-1', { enabled: true });
    expect(screen.getByText('Canal Um').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/channels/canal-um',
    );
    expect(screen.getByText('dashboard.status.DRAFT')).toBeInTheDocument();
  });

  it('offers the create link when the organization has no channels yet', () => {
    useOrgChannelsQuery.mockReturnValue({ data: [], isLoading: false });

    render(<ChannelsPageContent />);

    expect(screen.getAllByText('dashboard.new')[0].closest('a')).toHaveAttribute(
      'href',
      '/dashboard/channels/new',
    );
  });
});
