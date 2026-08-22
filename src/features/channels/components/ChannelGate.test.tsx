import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import type { PublicChannel } from '../types/channel.types';
import { ChannelGate } from './ChannelGate';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: true, isLoading: false }),
}));

const routerReplace = vi.fn();
const searchParamsState = { subscribed: null as string | null };
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => (key === 'subscribed' ? searchParamsState.subscribed : null) }),
  usePathname: () => '/channels/canal',
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const channelState: {
  data: PublicChannel | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: vi.fn(),
};
vi.mock('../queries/channel.queries', () => ({
  useChannelQuery: () => channelState,
}));

const accessState: { data: boolean; isLoading: boolean; refetch: () => void } = {
  data: true,
  isLoading: false,
  refetch: vi.fn(),
};
const playbackState = {
  data: {
    eventId: 'evt-1',
    live: true,
    stages: [],
    cameras: [],
    primaryCameraId: null,
    librasCameraId: null,
    latencyMode: 'STANDARD',
  },
  isLoading: false,
};
vi.mock('@/features/streaming/queries/live.queries', () => ({
  useLiveAccessQuery: () => accessState,
  useLivePlaybackQuery: () => playbackState,
}));

vi.mock('./ChannelPlayer', () => ({
  ChannelPlayer: ({ overlay }: { overlay?: ReactNode }) => (
    <div>
      channel-player-stub
      {overlay}
    </div>
  ),
}));

vi.mock('@/features/streaming/components/LiveGateLoading', () => ({
  LiveGateLoading: () => <div>loading-stub</div>,
}));

vi.mock('@/features/streaming/components/LiveNoAccess', () => ({
  LiveNoAccess: () => <div>no-access-stub</div>,
}));

vi.mock('./ChannelPaywall', () => ({
  ChannelPaywall: () => <div>paywall-stub</div>,
}));

vi.mock('@/shared/components/NotFoundContent', () => ({
  NotFoundContent: () => <div>not-found-stub</div>,
}));

const channel = (overrides: Partial<PublicChannel> = {}): PublicChannel =>
  ({
    id: 'ch-1',
    organizationId: 'org-1',
    slug: 'canal',
    name: 'Canal',
    description: null,
    coverUrl: null,
    accessMode: 'FREE',
    status: 'PUBLISHED',
    broadcastEventId: 'evt-1',
    timezone: 'America/Sao_Paulo',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    isOnAir: true,
    current: null,
    next: null,
    today: [],
    pricing: null,
    viewer: null,
    ...overrides,
  }) as PublicChannel;

describe('ChannelGate', () => {
  beforeEach(() => {
    channelState.data = undefined;
    channelState.isLoading = true;
    channelState.isError = false;
    accessState.data = true;
    playbackState.isLoading = false;
    playbackState.data.live = true;
    searchParamsState.subscribed = null;
    routerReplace.mockClear();
    vi.mocked(channelState.refetch).mockClear();
    vi.mocked(accessState.refetch).mockClear();
  });

  it('shows the loading state while the channel is resolving', () => {
    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('loading-stub')).toBeInTheDocument();
  });

  it('shows the 404 content for an unknown slug', () => {
    channelState.isLoading = false;
    channelState.isError = true;

    render(<ChannelGate slug="nope" chatEnabled={false} />);

    expect(screen.getByText('not-found-stub')).toBeInTheDocument();
  });

  it('keeps the player mounted when a background refetch fails', () => {
    channelState.isLoading = false;
    channelState.isError = true;
    channelState.data = channel();

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('channel-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('not-found-stub')).toBeNull();
  });

  it('renders the player when the channel is on air', () => {
    channelState.isLoading = false;
    channelState.data = channel();

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('channel-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('channels.offAir')).toBeNull();
  });

  // A grade (`isOnAir`, refetch de 60s) atrasa o encoder; quem manda é o
  // `live` do playback, que é pollado de 5 em 5 segundos.
  it('layers the off-air overlay inside the player when the stream is down', () => {
    channelState.isLoading = false;
    channelState.data = channel({ isOnAir: true });
    playbackState.data.live = false;

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('channel-player-stub')).toBeInTheDocument();
    expect(screen.getByText('channels.offAir')).toBeInTheDocument();
  });

  it('hides the overlay while the stream is up, even on a stale off-air schedule', () => {
    channelState.isLoading = false;
    channelState.data = channel({ isOnAir: false });
    playbackState.data.live = true;

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('channel-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('channels.offAir')).toBeNull();
  });

  it('shows the paywall for a subscription channel the viewer has no access to', () => {
    channelState.isLoading = false;
    channelState.data = channel({ accessMode: 'SUBSCRIPTION', viewer: null });
    accessState.data = false;

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('paywall-stub')).toBeInTheDocument();
    expect(screen.queryByText('channel-player-stub')).toBeNull();
    expect(screen.queryByText('no-access-stub')).toBeNull();
  });

  it('does not show the paywall for a FREE channel', () => {
    channelState.isLoading = false;
    channelState.data = channel({ accessMode: 'FREE' });

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.queryByText('paywall-stub')).toBeNull();
    expect(screen.getByText('channel-player-stub')).toBeInTheDocument();
  });

  it('renders the player for a subscribed viewer even without a live-access grant', () => {
    channelState.isLoading = false;
    channelState.data = channel({
      accessMode: 'SUBSCRIPTION',
      viewer: { subscribed: true, status: 'ACTIVE', cancelAtPeriodEnd: false, currentPeriodEnd: null },
    });
    accessState.data = false;

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('channel-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('paywall-stub')).toBeNull();
  });

  it('shows a success toast and clears ?subscribed=1 from the url', async () => {
    channelState.isLoading = false;
    channelState.data = channel({ accessMode: 'SUBSCRIPTION', viewer: null });
    accessState.data = false;
    searchParamsState.subscribed = '1';

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('subscribed'));
    expect(routerReplace).toHaveBeenCalledWith('/channels/canal');
    expect(channelState.refetch).toHaveBeenCalled();
    expect(accessState.refetch).toHaveBeenCalled();
  });
});
