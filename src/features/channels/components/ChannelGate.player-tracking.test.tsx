/**
 * Regression for a duplicate `feature_viewed`/`feature_time` pair observed on
 * the channel page: opening an off-air channel fired feature_viewed twice
 * (~1ms apart) for the "player" feature. Root cause turned out to be React
 * StrictMode (on by default in Next dev) double-invoking useFeatureTimer's
 * mount effect the instant Player.Root first mounts — not a ChannelGate
 * branch-swap (Player.Root only ever renders in ChannelGate's final branch).
 * The fix lives in the shared SDK (feature-timer.ts); this test uses the
 * REAL TrackFeature (not a stub) through the real ChannelPlayer → LivePlayer
 * → Player.Root chain (only leaf dependencies — CameraGrid, chat, viewer
 * tracking — are stubbed) and proves it holds across the loading → off-air
 * ready transition, under StrictMode.
 */
import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as providerModule from '../../../../shared/analytics-sdk/src/react/provider';
import type { PublicChannel } from '../types/channel.types';
import { ChannelGate } from './ChannelGate';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'pt-BR' }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: true, isLoading: false, user: null }),
}));
vi.mock('@/features/streaming/queries/live.queries', () => ({
  useLiveAccessQuery: () => ({ data: true, isLoading: false }),
}));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: vi.fn() }) }));

vi.mock('@/features/streaming/components/CameraGrid', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/features/streaming/components/CameraGrid')>();
  return { ...mod, CameraGrid: () => <div data-testid="grid" /> };
});
vi.mock('@/features/streaming/components/RecommendedOverlay', () => ({ RecommendedOverlay: () => null }));
vi.mock('@/features/advertisements/components/PauseAdTakeover', () => ({ PauseAdTakeover: () => null }));
vi.mock('@/features/streaming/hooks/use-viewer-tracking', () => ({ useViewerTracking: () => {} }));
vi.mock('@/features/streaming/hooks/use-viewer-count', () => ({ useViewerCount: () => ({ currentViewers: 0 }) }));
vi.mock('@/features/chat', () => ({
  useChat: () => ({
    messages: [], totalReactions: 0, sendMessage: vi.fn(), react: vi.fn(), reactionCounts: {},
    me: null, status: 'idle', deleteMessage: vi.fn(), muteUser: vi.fn(), unmuteUser: vi.fn(),
  }),
  ChatDock: () => null,
  ReactionsTicker: () => null,
}));

const channelState: { data: PublicChannel | undefined; isLoading: boolean; refetch: () => void } = {
  data: undefined,
  isLoading: false,
  refetch: vi.fn(),
};
const playbackState: { data: unknown; isLoading: boolean } = { data: undefined, isLoading: true };
vi.mock('../queries/channel.queries', () => ({
  useChannelQuery: () => channelState,
  useChannelPlaybackQuery: () => playbackState,
}));

const channel: PublicChannel = {
  id: 'ch-1',
  organizationId: 'org-1',
  slug: 'canal-classico-24h',
  name: 'Canal Clássico 24h',
  description: null,
  coverUrl: null,
  accessMode: 'FREE',
  status: 'PUBLISHED',
  broadcastEventId: 'evt-1',
  timezone: 'America/Sao_Paulo',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  isOnAir: false,
  current: null,
  next: null,
  today: [],
  pricing: null,
  viewer: null,
} as PublicChannel;

const offAirPlayback = {
  live: false,
  latencyMode: 'STANDARD',
  stages: [],
  cameras: [],
  primaryCameraId: null,
  librasCameraId: null,
  playbackEventId: 'evt-1',
  channelEventId: 'evt-1',
  source: { mode: 'own', reason: 'own', event: null },
};

describe('ChannelGate — player TrackFeature mount, off-air channel', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    channelState.data = channel;
    channelState.isLoading = false;
    playbackState.data = undefined;
    playbackState.isLoading = true;
  });

  it('emits feature_viewed exactly once across the loading → off-air-ready transition, even under StrictMode', () => {
    const trackUntyped = vi.fn();
    vi.spyOn(providerModule, 'useAnalytics').mockReturnValue({
      trackUntyped,
      flush: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof providerModule.useAnalytics>);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const makeTree = () => (
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <ChannelGate slug="canal-classico-24h" chatEnabled={false} />
        </QueryClientProvider>
      </StrictMode>
    );

    const { rerender } = render(makeTree());
    expect(trackUntyped).not.toHaveBeenCalledWith('feature_viewed', expect.anything());

    playbackState.data = offAirPlayback;
    playbackState.isLoading = false;
    rerender(makeTree());

    const viewedCalls = trackUntyped.mock.calls.filter(([eventName]) => eventName === 'feature_viewed');
    const timeCalls = trackUntyped.mock.calls.filter(([eventName]) => eventName === 'feature_time');
    expect(viewedCalls).toHaveLength(1);
    expect(timeCalls).toHaveLength(0);
  });
});
