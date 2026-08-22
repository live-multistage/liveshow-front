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
const orgChannelState: { data: unknown } = { data: undefined };
vi.mock('../../queries/channel.queries', () => ({
  useChannelQuery: () => channelState,
  useOrgChannelQuery: () => orgChannelState,
}));

const publishMutate = vi.fn();
const archiveMutate = vi.fn();
const syncPricingMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  usePublishChannelMutation: () => ({ mutate: publishMutate, isPending: false }),
  useArchiveChannelMutation: () => ({ mutate: archiveMutate, isPending: false }),
  useSyncChannelPricingMutation: () => ({ mutate: syncPricingMutate, isPending: false }),
}));

vi.mock('./SubscriptionSummaryCard', () => ({
  SubscriptionSummaryCard: () => <div>summary-card-stub</div>,
}));

const gridProps: Record<string, unknown> = {};
vi.mock('./ProgramGridEditor', () => ({
  ProgramGridEditor: (props: Record<string, unknown>) => {
    Object.assign(gridProps, props);
    return <div>program-grid-stub</div>;
  },
}));

const onAirProps: Record<string, unknown> = {};
vi.mock('./ChannelOnAirPanel', () => ({
  ChannelOnAirPanel: (props: Record<string, unknown>) => {
    Object.assign(onAirProps, props);
    return <div>on-air-panel-stub</div>;
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
    source: { mode: 'own', reason: 'own', event: null },
    ...overrides,
  }) as PublicChannel;

describe('ChannelDetailContent', () => {
  beforeEach(() => {
    publishMutate.mockReset();
    archiveMutate.mockReset();
    syncPricingMutate.mockReset();
    channelState.data = channel();
    channelState.isLoading = false;
    orgChannelState.data = undefined;
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

  // O nome vai junto porque o container do canal não aparece em /events, então o
  // seletor da página de streams não teria como rotular a opção.
  it('links the camera setup to the channel broadcast event, carrying its name', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('dashboard.configureCameras')).toHaveAttribute(
      'href',
      `/dashboard/streams?eventId=evt-1&title=${encodeURIComponent(channelState.data!.name)}`,
    );
  });

  it('renders the program grid with the channel timezone and status', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('program-grid-stub')).toBeInTheDocument();
    expect(gridProps).toMatchObject({
      channelId: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
      timezone: 'America/Sao_Paulo',
      status: 'DRAFT',
    });
  });

  it('renders the on-air panel with the channel source and org override', () => {
    channelState.data = channel({ source: { mode: 'own', reason: 'own', event: null } });
    orgChannelState.data = { id: 'ch-1', sourceOverride: { eventId: 'evt-9', until: '2026-08-25T00:00:00.000Z' } };

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('on-air-panel-stub')).toBeInTheDocument();
    expect(onAirProps).toMatchObject({
      channelId: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
      source: { mode: 'own', reason: 'own', event: null },
      sourceOverride: { eventId: 'evt-9', until: '2026-08-25T00:00:00.000Z' },
    });
  });

  it('opens the edit form from the header', () => {
    render(<ChannelDetailContent slug="canal-um" />);
    expect(screen.queryByText(/channel-form-stub/)).toBeNull();

    fireEvent.click(screen.getByText('dashboard.edit'));

    expect(screen.getByText(/channel-form-stub:edit/)).toBeInTheDocument();
  });

  it('hides sync status and the summary card for a FREE channel', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.queryByText('syncStatusPending')).toBeNull();
    expect(screen.queryByText('syncStatusSynced')).toBeNull();
    expect(screen.queryByText('summary-card-stub')).toBeNull();
  });

  it('shows a pending sync chip and a sync button for an unsynced SUBSCRIPTION channel', () => {
    channelState.data = channel({ accessMode: 'SUBSCRIPTION' });
    orgChannelState.data = { id: 'ch-1', pricingSynced: false, currency: 'BRL' };

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('syncStatusPending')).toBeInTheDocument();
    expect(screen.getByText('summary-card-stub')).toBeInTheDocument();

    fireEvent.click(screen.getByText('syncButton'));
    expect(syncPricingMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
    });
  });

  it('shows neither the sync chip nor the sync button while org pricing is still loading', () => {
    channelState.data = channel({ accessMode: 'SUBSCRIPTION' });
    orgChannelState.data = undefined;

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.queryByText('syncStatusPending')).toBeNull();
    expect(screen.queryByText('syncStatusSynced')).toBeNull();
    expect(screen.queryByText('syncButton')).toBeNull();
  });

  it('shows a synced chip and hides the sync button once pricing is synced', () => {
    channelState.data = channel({ accessMode: 'SUBSCRIPTION' });
    orgChannelState.data = { id: 'ch-1', pricingSynced: true, currency: 'BRL' };

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('syncStatusSynced')).toBeInTheDocument();
    expect(screen.queryByText('syncButton')).toBeNull();
  });
});
