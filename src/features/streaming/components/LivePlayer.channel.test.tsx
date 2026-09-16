/**
 * Regression guard for the channel-mode transport order: a channel has no DVR
 * scrubber (see live-scrubber.ts's `showPlayback` gate), so LivePlayer used to
 * declare its spacer-or-scrubber slot BEFORE <Transport.Volume>, which pushed
 * the volume control into the right-hand cluster whenever there's no
 * scrubber — channel mode, and live before the DVR window opens. Volume
 * belongs to the LEFT of the spacer, matching the pre-refactor TransportBar's
 * `Play → Badge → [Scrubber] → Volume → [Spacer] → AudioCamera → Quality →
 * Pip → Fullscreen` order (see `git show 3ace07a:.../TransportBar.tsx`).
 *
 * CameraGrid is stubbed (same pattern as player/Player.test.tsx) — this test
 * only cares about the transport bar's DOM order, not real playback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LivePlayer } from './LivePlayer';
import type { LiveCamera } from '../types/live.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: true, user: null }) }));
vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));
vi.mock('./RecommendedOverlay', () => ({ RecommendedOverlay: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/advertisements/components/PauseAdTakeover', () => ({ PauseAdTakeover: () => null }));
vi.mock('../hooks/use-viewer-tracking', () => ({ useViewerTracking: () => {} }));
vi.mock('../hooks/use-viewer-count', () => ({ useViewerCount: () => ({ currentViewers: 0 }) }));
vi.mock('@/features/chat', () => ({
  useChat: () => ({ messages: [], totalReactions: 0, sendMessage: vi.fn(), react: vi.fn(), reactionCounts: {}, me: null, status: 'idle', deleteMessage: vi.fn(), muteUser: vi.fn(), unmuteUser: vi.fn() }),
  ChatDock: () => null,
  ReactionsTicker: () => null,
}));
vi.mock('./CameraGrid', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./CameraGrid')>();
  return { ...mod, CameraGrid: () => <div data-testid="grid" /> };
});

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const cam = (cameraId: string, priority: number): LiveCamera => ({
  cameraId, name: `Cam ${cameraId}`, slug: cameraId, priority, manifestPath: `/live/${cameraId}.m3u8`, llPath: null, live: true, thumbnailUrl: null, coverage: [],
});

describe('LivePlayer — channel mode transport order', () => {
  it('keeps the volume control left of the spacer when there is no scrubber', () => {
    const { container, getByLabelText } = render(
      <LivePlayer
        cameras={[cam('a', 1), cam('b', 2)]}
        title="Canal"
        eventId="evt-1"
        chatEnabled={false}
        variant="channel"
      />,
    );
    const volume = getByLabelText('mute');
    const spacer = container.querySelector('[class*="spacer"]')!;
    expect(spacer).toBeTruthy();
    expect(volume.compareDocumentPosition(spacer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
