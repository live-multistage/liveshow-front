import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
const playbackState = {
  data: {
    live: true,
    stages: [],
    cameras: [],
    primaryCameraId: null,
    librasCameraId: null,
    latencyMode: 'STANDARD',
    playbackEventId: 'evt-1',
    channelEventId: 'evt-1',
    source: { mode: 'own', reason: 'own', event: null },
  },
  isLoading: false,
};
vi.mock('../queries/channel.queries', () => ({
  useChannelQuery: () => channelState,
  useChannelPlaybackQuery: () => playbackState,
}));

const accessState: { data: boolean; isLoading: boolean; refetch: () => void } = {
  data: true,
  isLoading: false,
  refetch: vi.fn(),
};
vi.mock('@/features/streaming/queries/live.queries', () => ({
  useLiveAccessQuery: () => accessState,
}));

interface AudioState {
  muted: boolean;
  volume: number;
}
vi.mock('./ChannelPlayer', () => ({
  ChannelPlayer: ({
    overlay,
    initialAudio,
    onAudioChange,
  }: {
    overlay?: ReactNode;
    initialAudio?: AudioState;
    onAudioChange?: (audio: AudioState) => void;
  }) => (
    <div>
      channel-player-stub
      {overlay}
      <span>muted:{String(initialAudio?.muted)}</span>
      <button onClick={() => onAudioChange?.({ muted: !initialAudio?.muted, volume: initialAudio?.volume ?? 1 })}>
        toggle-mute
      </button>
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
    accessState.isLoading = false;
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
  // `live` do playback, que é pollado de 15 em 15 segundos.
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

  it('renders the player for a subscribed viewer without waiting on the live-access query', () => {
    channelState.isLoading = false;
    channelState.data = channel({
      accessMode: 'SUBSCRIPTION',
      viewer: { subscribed: true, status: 'ACTIVE', cancelAtPeriodEnd: false, currentPeriodEnd: null },
    });
    accessState.isLoading = true;
    accessState.data = false;

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('channel-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('loading-stub')).toBeNull();
  });

  it('shows the past-due banner above the player when the subscription payment failed', () => {
    channelState.isLoading = false;
    channelState.data = channel({
      accessMode: 'SUBSCRIPTION',
      viewer: { subscribed: true, status: 'PAST_DUE', cancelAtPeriodEnd: false, currentPeriodEnd: null },
    });

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('channel-player-stub')).toBeInTheDocument();
    expect(screen.getByText('pastDueBanner')).toBeInTheDocument();
    expect(screen.getByText('pastDueAction').closest('a')).toHaveAttribute('href', '/account/subscriptions');
  });

  it('dismisses the past-due banner on click', () => {
    channelState.isLoading = false;
    channelState.data = channel({
      accessMode: 'SUBSCRIPTION',
      viewer: { subscribed: true, status: 'PAST_DUE', cancelAtPeriodEnd: false, currentPeriodEnd: null },
    });

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    fireEvent.click(screen.getByLabelText('dismiss'));

    expect(screen.queryByText('pastDueBanner')).toBeNull();
  });

  it('omits the past-due banner for an active subscriber', () => {
    channelState.isLoading = false;
    channelState.data = channel({
      accessMode: 'SUBSCRIPTION',
      viewer: { subscribed: true, status: 'ACTIVE', cancelAtPeriodEnd: false, currentPeriodEnd: null },
    });

    render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.queryByText('pastDueBanner')).toBeNull();
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

  it('keeps polling the channel every 2s (webhook lag) instead of flashing the paywall, then gives up after 5 tries', async () => {
    vi.useFakeTimers();
    try {
      channelState.isLoading = false;
      channelState.data = channel({ accessMode: 'SUBSCRIPTION', viewer: null });
      accessState.data = false;
      searchParamsState.subscribed = '1';

      render(<ChannelGate slug="canal" chatEnabled={false} />);

      // Still shows the loading state, not the paywall, right after checkout.
      expect(screen.getByText('loading-stub')).toBeInTheDocument();
      expect(screen.queryByText('paywall-stub')).toBeNull();
      expect(channelState.refetch).toHaveBeenCalledTimes(1); // the ?subscribed=1 refetch

      for (let i = 0; i < 5; i += 1) {
        await act(async () => {
          vi.advanceTimersByTime(2000);
        });
      }
      // One extra flush: the 5th retry's state update (awaitingSubscription
      // -> false) is itself a follow-up effect from the timer callback, so it
      // needs its own microtask tick to commit.
      await act(async () => {});

      // 1 initial refetch + 5 poll retries.
      expect(channelState.refetch).toHaveBeenCalledTimes(6);
      // Viewer never came back subscribed in this mock — falls through to the paywall.
      expect(screen.getByText('paywall-stub')).toBeInTheDocument();
      expect(screen.queryByText('loading-stub')).toBeNull();

      // No further retries scheduled once the polling budget is spent.
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(channelState.refetch).toHaveBeenCalledTimes(6);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops polling and renders the player once the viewer shows up as subscribed', async () => {
    vi.useFakeTimers();
    try {
      channelState.isLoading = false;
      channelState.data = channel({ accessMode: 'SUBSCRIPTION', viewer: null });
      accessState.data = false;
      searchParamsState.subscribed = '1';

      render(<ChannelGate slug="canal" chatEnabled={false} />);
      expect(screen.getByText('loading-stub')).toBeInTheDocument();

      // Webhook lands before the first retry fires.
      channelState.data = channel({
        accessMode: 'SUBSCRIPTION',
        viewer: { subscribed: true, status: 'ACTIVE', cancelAtPeriodEnd: false, currentPeriodEnd: null },
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText('channel-player-stub')).toBeInTheDocument();
      expect(screen.queryByText('paywall-stub')).toBeNull();

      // No more retries after the viewer is confirmed subscribed.
      const callsSoFar = vi.mocked(channelState.refetch).mock.calls.length;
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(channelState.refetch).toHaveBeenCalledTimes(callsSoFar);
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves mute across a simulcast source change', () => {
    channelState.isLoading = false;
    channelState.data = channel();

    const { rerender } = render(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('muted:false')).toBeInTheDocument();

    fireEvent.click(screen.getByText('toggle-mute'));
    expect(screen.getByText('muted:true')).toBeInTheDocument();

    // The channel's simulcast source switches (own feed <-> a carried
    // event) — ChannelPlayer remounts its LivePlayer internally, but the
    // `audio` state held here in ChannelGate, above that boundary, must
    // still hand back the viewer's choice as the next mount's seed.
    playbackState.data = {
      ...playbackState.data,
      source: {
        mode: 'event',
        reason: 'program',
        event: { id: 'evt-2', title: 'Jogo', startsAt: '2026-08-22T20:00:00.000Z', endsAt: '2026-08-22T22:00:00.000Z' },
      },
    };
    rerender(<ChannelGate slug="canal" chatEnabled={false} />);

    expect(screen.getByText('muted:true')).toBeInTheDocument();
  });
});
