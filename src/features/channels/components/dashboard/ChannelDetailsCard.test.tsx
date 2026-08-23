import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PublicChannel } from '../../types/channel.types';
import { ChannelDetailsCard } from './ChannelDetailsCard';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'pt-BR',
}));

const archiveMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useArchiveChannelMutation: () => ({ mutate: archiveMutate, isPending: false }),
}));

vi.mock('@/features/organizations/queries/get-my-organizations', () => ({
  useMyOrganizationsQuery: () => ({ data: [{ id: 'org-1', name: 'Estúdio Um' }] }),
}));

const channel = (overrides: Partial<PublicChannel> = {}): PublicChannel =>
  ({
    id: 'ch-1',
    organizationId: 'org-1',
    slug: 'canal-um',
    name: 'Canal Um',
    status: 'PUBLISHED',
    accessMode: 'FREE',
    timezone: 'America/Sao_Paulo',
    broadcastEventId: 'evt-1',
    createdAt: '2026-08-01T12:00:00.000Z',
    ...overrides,
  }) as PublicChannel;

describe('ChannelDetailsCard', () => {
  beforeEach(() => archiveMutate.mockReset());

  it('shows the organization name and the creation date', () => {
    render(<ChannelDetailsCard channel={channel()} />);

    expect(screen.getByText('Estúdio Um')).toBeInTheDocument();
    expect(screen.getByText('01/08/2026')).toBeInTheDocument();
    expect(screen.getByText('replayValue')).toBeInTheDocument();
  });

  it('archives only after the confirmation dialog', () => {
    render(<ChannelDetailsCard channel={channel()} />);

    fireEvent.click(screen.getByText('archive'));
    expect(archiveMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('confirm'));

    expect(archiveMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
    });
  });

  it('drops the archive action out of the confirmation without archiving', () => {
    render(<ChannelDetailsCard channel={channel()} />);

    fireEvent.click(screen.getByText('archive'));
    fireEvent.click(screen.getByText('cancel'));

    expect(archiveMutate).not.toHaveBeenCalled();
  });

  it('hides the archive action for an already archived channel', () => {
    render(<ChannelDetailsCard channel={channel({ status: 'ARCHIVED' })} />);

    expect(screen.queryByText('archive')).toBeNull();
  });
});
