import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PublicChannel } from '../../types/channel.types';
import { ChannelDetailContent } from './ChannelDetailContent';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'pt-BR',
}));

const channelState: { data: PublicChannel | undefined; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
const orgChannelState: { data: unknown } = { data: undefined };
const programsState: { data: unknown[] } = { data: [] };
vi.mock('../../queries/channel.queries', () => ({
  useChannelQuery: () => channelState,
  useOrgChannelQuery: () => orgChannelState,
  useChannelProgramsQuery: () => programsState,
}));

const camerasState = { cameras: [] as Array<{ id: string; name: string; stageName: string; live: boolean }>, withSignal: 0, isLoading: false };
vi.mock('../../hooks/useChannelCameras', () => ({
  useChannelCameras: () => camerasState,
}));

const publishMutate = vi.fn();
const publishState = { mutate: publishMutate, isPending: false };
vi.mock('../../mutations/channel.mutations', () => ({
  usePublishChannelMutation: () => publishState,
}));

vi.mock('./ChannelOnAirPanel', () => ({
  ChannelOnAirPanel: (props: Record<string, unknown>) => (
    <div data-testid="on-air-panel" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock('./ProgramWeekGrid', () => ({
  ProgramWeekGrid: (props: Record<string, unknown>) => (
    <div data-testid="week-grid" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock('./ChannelAccessCard', () => ({
  ChannelAccessCard: ({ channel }: { channel: { accessMode: string } }) => (
    <div>access-card-stub:{channel.accessMode}</div>
  ),
}));
vi.mock('./ChannelCamerasCard', () => ({
  ChannelCamerasCard: ({ manageHref }: { manageHref: string }) => (
    <a href={manageHref}>cameras-card-stub</a>
  ),
}));
vi.mock('./ChannelDetailsCard', () => ({
  ChannelDetailsCard: () => <div>details-card-stub</div>,
}));
vi.mock('./ChannelForm', () => ({
  ChannelForm: ({ initial }: { initial: { slug: string } }) => (
    <div>channel-form-stub:{initial.slug}</div>
  ),
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

const withCameras = (count: number, live = 0) => {
  camerasState.cameras = Array.from({ length: count }, (_, index) => ({
    id: `cam-${index}`,
    name: `Câmera ${index}`,
    stageName: 'Palco',
    live: index < live,
  }));
  camerasState.withSignal = live;
};

describe('ChannelDetailContent', () => {
  beforeEach(() => {
    publishMutate.mockReset();
    publishState.isPending = false;
    channelState.data = channel();
    channelState.isLoading = false;
    orgChannelState.data = undefined;
    programsState.data = [];
    withCameras(0);
  });

  it('shows the channel name and its status pill', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByRole('heading', { name: 'Canal Um' })).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('blocks publishing while a required item is pending', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('publish')).toBeDisabled();
    fireEvent.click(screen.getByText('publish'));
    expect(publishMutate).not.toHaveBeenCalled();
  });

  it('publishes with the ids the invalidation needs once the channel is ready', () => {
    withCameras(2, 1);

    render(<ChannelDetailContent slug="canal-um" />);
    fireEvent.click(screen.getByText('publish'));

    expect(publishMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
    });
  });

  it('shows a pending publish label while the mutation runs', () => {
    withCameras(1);
    publishState.isPending = true;

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('publishing')).toBeDisabled();
  });

  // Não existe rota de despublicar no backend — o caminho de saída é arquivar.
  it('hides the publish action for an already published channel', () => {
    channelState.data = channel({ status: 'PUBLISHED' });

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.queryByText('publish')).toBeNull();
  });

  it('offers publishing again for an archived channel', () => {
    channelState.data = channel({ status: 'ARCHIVED' });
    withCameras(1);

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('publish')).toBeEnabled();
  });

  it('shows the readiness checklist only while the channel is a draft', () => {
    render(<ChannelDetailContent slug="canal-um" />);
    expect(screen.getByText('camerasTitle')).toBeInTheDocument();

    channelState.data = channel({ status: 'PUBLISHED' });
    render(<ChannelDetailContent slug="canal-um" />);
    expect(screen.getAllByText('camerasTitle')).toHaveLength(1);
  });

  it('shows the on-air pill only for a published channel that is on air', () => {
    channelState.data = channel({ status: 'PUBLISHED', isOnAir: true });

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('onAir')).toBeInTheDocument();
  });

  it('shows the off-air pill for a published channel with no signal', () => {
    channelState.data = channel({ status: 'PUBLISHED' });

    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('offAir')).toBeInTheDocument();
  });

  // O nome vai junto porque o container do canal não aparece em /events, então o
  // seletor da página de streams não teria como rotular a opção.
  it('links the camera setup to the channel broadcast event, carrying its name', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(screen.getByText('cameras')).toHaveAttribute(
      'href',
      `/dashboard/streams?eventId=evt-1&title=${encodeURIComponent('Canal Um')}`,
    );
  });

  it('renders the week grid with the channel timezone and status', () => {
    render(<ChannelDetailContent slug="canal-um" />);

    expect(JSON.parse(screen.getByTestId('week-grid').dataset.props!)).toMatchObject({
      channelId: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
      timezone: 'America/Sao_Paulo',
      status: 'DRAFT',
    });
  });

  it('renders the on-air panel with the channel source and org override', () => {
    orgChannelState.data = {
      id: 'ch-1',
      sourceOverride: { eventId: 'evt-9', until: '2026-08-25T00:00:00.000Z' },
    };

    render(<ChannelDetailContent slug="canal-um" />);

    expect(JSON.parse(screen.getByTestId('on-air-panel').dataset.props!)).toMatchObject({
      channelId: 'ch-1',
      source: { mode: 'own', reason: 'own', event: null },
      sourceOverride: { eventId: 'evt-9', until: '2026-08-25T00:00:00.000Z' },
      isOnAir: false,
    });
  });

  it('opens the edit form from the header', () => {
    render(<ChannelDetailContent slug="canal-um" />);
    expect(screen.queryByText(/channel-form-stub/)).toBeNull();

    fireEvent.click(screen.getByText('edit'));

    expect(screen.getByText(/channel-form-stub:canal-um/)).toBeInTheDocument();
  });

  it('renders the access card for both FREE and SUBSCRIPTION channels', () => {
    render(<ChannelDetailContent slug="canal-um" />);
    expect(screen.getByText('access-card-stub:FREE')).toBeInTheDocument();

    channelState.data = channel({ accessMode: 'SUBSCRIPTION' });
    render(<ChannelDetailContent slug="canal-um" />);
    expect(screen.getByText('access-card-stub:SUBSCRIPTION')).toBeInTheDocument();
  });
});
