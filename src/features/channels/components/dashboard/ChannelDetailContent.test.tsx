import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PublicChannel } from '../../types/channel.types';
import { ChannelDetailContent } from './ChannelDetailContent';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const channelState: { data: PublicChannel | undefined; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
vi.mock('../../queries/channel.queries', () => ({
  useChannelQuery: () => channelState,
}));

const publishMutate = vi.fn();
const archiveMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  usePublishChannelMutation: () => ({ mutate: publishMutate, isPending: false }),
  useArchiveChannelMutation: () => ({ mutate: archiveMutate, isPending: false }),
}));

const gridProps: Record<string, unknown> = {};
vi.mock('./ProgramGridEditor', () => ({
  ProgramGridEditor: (props: Record<string, unknown>) => {
    Object.assign(gridProps, props);
    return <div>program-grid-stub</div>;
  },
}));

vi.mock('./ChannelForm', () => ({
  ChannelForm: ({ mode }: { mode?: string }) => <div>channel-form-stub:{mode}</div>,
}));

const channel = (overrides: Partial<PublicChannel> = {}): PublicChannel =>
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
    isOnAir: false,
    current: null,
    next: null,
    today: [],
    ...overrides,
  }) as PublicChannel;

describe('ChannelDetailContent', () => {
  beforeEach(() => {
    publishMutate.mockReset();
    archiveMutate.mockReset();
    channelState.data = channel();
    channelState.isLoading = false;
  });

  it('shows the channel name and its status chip', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('Canal Um')).toBeInTheDocument();
    expect(screen.getByText('dashboard.status.DRAFT')).toBeInTheDocument();
  });

  it('publishes the channel with the ids the invalidation needs', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    fireEvent.click(screen.getByText('dashboard.publish'));

    expect(publishMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
    });
  });

  it('archives the channel', () => {
    channelState.data = channel({ status: 'PUBLISHED' });

    render(<ChannelDetailContent slug="canal-um" />);

    fireEvent.click(screen.getByText('dashboard.archive'));

    expect(archiveMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
    });
  });

  it('hides the publish action for an already published channel', () => {
    channelState.data = channel({ status: 'PUBLISHED' });

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.queryByText('dashboard.publish')).toBeNull();
  });

  it('shows the on-air marker only while the channel is on air', () => {
    render(<ChannelDetailContent slug="canal-um" />);
    expect(screen.queryByText('onAir')).toBeNull();

    channelState.data = channel({ isOnAir: true });
    render(<ChannelDetailContent slug="canal-um" />);
    expect(screen.getAllByText('onAir')).toHaveLength(1);
  });

  it('links the camera setup to the channel broadcast event', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('dashboard.configureCameras')).toHaveAttribute(
      'href',
      '/dashboard/streams?eventId=evt-1',
    );
  });

  it('renders the program grid with the channel timezone and status', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('program-grid-stub')).toBeInTheDocument();
    expect(gridProps).toMatchObject({
      channelId: 'ch-1',
      slug: 'canal-um',
      timezone: 'America/Sao_Paulo',
      status: 'DRAFT',
    });
  });

  it('opens the edit form from the header', () => {
    render(<ChannelDetailContent slug="canal-um" />);
    expect(screen.queryByText(/channel-form-stub/)).toBeNull();

    fireEvent.click(screen.getByText('dashboard.edit'));

    expect(screen.getByText(/channel-form-stub:edit/)).toBeInTheDocument();
  });
});
