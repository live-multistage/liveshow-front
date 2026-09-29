/**
 * The compound layout parts: declaration order, what Stage wires into
 * CameraGrid, the pause-ad gate and the dev-only duplicate-part guard,
 * plus the chrome cases inherited from the deleted PlayerLayout.test.tsx.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Player } from './Player';
import { usePlayerShell } from '../../hooks/use-player-shell';
import type { UsePlayerShellOptions } from '../../hooks/use-player-shell';
import { DRAWER_W } from '../CameraGrid';
import type { CameraGridProps } from '../CameraGrid';
import type { LiveCamera } from '../../types/live.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: true, user: null }) }));
// A stable `analytics` object (not a fresh one per call) mirrors the real
// AnalyticsProvider, whose instance lives in a ref — Player.tsx's
// useCallback(handlePlaying/handleBuffered, [analytics, ...]) would spuriously
// re-identify every render otherwise, masking exactly the kind of identity
// churn this suite is meant to catch.
const mockTrack = vi.hoisted(() => vi.fn());
const mockAnalytics = vi.hoisted(() => ({ track: mockTrack }));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => mockAnalytics }));
vi.mock('@live-show/analytics-sdk/react', () => ({ TrackFeature: ({ children }: { children: unknown }) => children }));
vi.mock('../RecommendedOverlay', () => ({ RecommendedOverlay: () => null }));
const pushMock = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('@/features/advertisements/components/PauseAdTakeover', () => ({
  PauseAdTakeover: ({ onVisibleChange }: { onVisibleChange: (v: boolean) => void }) => (
    <button data-testid="fake-ad" onClick={() => onVisibleChange(true)} />
  ),
}));

// CameraGrid is stubbed, but Player.Stage's whole job is what it hands over —
// so the stub records every props object it was called with.
const h = vi.hoisted(() => ({ gridCalls: [] as unknown[] }));
vi.mock('../CameraGrid', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../CameraGrid')>();
  return {
    ...mod,
    CameraGrid: (props: unknown) => {
      h.gridCalls.push(props);
      return <div data-testid="grid" />;
    },
  };
});
const lastGridProps = () => h.gridCalls[h.gridCalls.length - 1] as CameraGridProps;

const cam = (cameraId: string, priority: number): LiveCamera => ({
  cameraId, name: `Cam ${cameraId}`, slug: cameraId, priority, manifestPath: `/live/${cameraId}.m3u8`, llPath: null, live: true, thumbnailUrl: null, coverage: [],
});

function Harness({ options, children }: { options: UsePlayerShellOptions; children?: ReactNode }) {
  const shell = usePlayerShell(options);
  return (
    <Player.Root shell={shell} mode="live" eventId="evt-1" title="Show">
      {children ?? (
        <>
          <Player.Header badge="live" />
          <Player.Stage />
          <Player.Transport>
            <div data-testid="transport" />
          </Player.Transport>
        </>
      )}
    </Player.Root>
  );
}

beforeEach(() => {
  h.gridCalls.length = 0;
  pushMock.mockClear();
  mockTrack.mockClear();
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

describe('Player layout parts', () => {
  it('renders the parts in declaration order inside the fullscreen container', () => {
    const { container } = render(<Harness options={{ cameras: [cam('a', 1)] }} />);
    const root = container.firstElementChild!;
    expect(Array.from(root.children).map((el) => el.tagName.toLowerCase())).toEqual(['header', 'div', 'div']);
    expect(root.children[1].querySelector('[data-testid="grid"]')).not.toBeNull();
    expect(root.children[2].querySelector('[data-testid="transport"]')).not.toBeNull();
  });

  it('wires CameraGrid from the shell and forwards only the mode-specific props', () => {
    const onEnded = vi.fn();
    render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Player.Stage positionMs={4242} onEnded={onEnded} dvrActive />
      </Harness>,
    );
    const props = lastGridProps();
    // From the mode, straight through.
    expect(props.positionMs).toBe(4242);
    expect(props.dvrActive).toBe(true);
    expect(props.onEnded).toBe(onEnded);
    // From the context / shell, never passed by the mode.
    expect(props.mode).toBe('live');
    expect(props.cameras.map((c) => c.cameraId)).toEqual(['a']);
    expect(props.volume).toBe(1);
    expect(props.globalMuted).toBe(false);
  });

  it('maps every non-replay mode onto CameraGrid live playback', () => {
    function ChannelHarness() {
      const shell = usePlayerShell({ cameras: [cam('a', 1)], playbackEnabled: false });
      return (
        <Player.Root shell={shell} mode="channel" eventId="evt-1" title="Canal">
          <Player.Stage />
        </Player.Root>
      );
    }
    render(<ChannelHarness />);
    expect(lastGridProps().mode).toBe('live');
  });

  it('renders Aside children and the Overlay without extra chrome', () => {
    const { getByTestId } = render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Player.Stage />
        <Player.Aside><div data-testid="chat-dock" /></Player.Aside>
        <Player.Overlay />
      </Harness>,
    );
    expect(getByTestId('chat-dock')).toBeTruthy();
  });

  it('warns in development when Stage is declared more than once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Player.Stage />
        <Player.Stage />
      </Harness>,
    );
    expect(warn).toHaveBeenCalledWith('<Player.Stage> rendered 2 times inside <Player.Root>; only one is supported.');
    warn.mockRestore();
  });

  it('warns in development when Transport is declared more than once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Player.Transport><div data-testid="transport-1" /></Player.Transport>
        <Player.Transport><div data-testid="transport-2" /></Player.Transport>
      </Harness>,
    );
    expect(warn).toHaveBeenCalledWith('<Player.Transport> rendered 2 times inside <Player.Root>; only one is supported.');
    warn.mockRestore();
  });

  it('defines the header-hidden rule in the stylesheet it hands to Header', () => {
    // The old PlayerLayout read this class from a module that never declared
    // it, so the header only appeared to hide (vitest runs with css: false).
    const scssPath = join(dirname(fileURLToPath(import.meta.url)), 'PlayerParts.module.scss');
    const scss = readFileSync(scssPath, 'utf8');
    expect(scss).toContain('.headerHidden');
  });
});

// Inherited from PlayerLayout.test.tsx: the chrome the parts drive through
// <Header>. Playback itself stays covered by ReplayPlayer/ChannelPlayer.
describe('Player chrome', () => {
  it('renders the header badge and starts paused when asked', () => {
    const { getByText, container } = render(
      <Harness options={{ cameras: [cam('a', 1)], initialPaused: true }}>
        <Player.Header badge="replay" />
        <Player.Stage />
      </Harness>,
    );
    expect(getByText('REPLAY')).toBeTruthy();
    // initialPaused surfaces as PlayerStage's centre play overlay.
    expect(container.querySelector('[aria-label="resume"]')).not.toBeNull();
  });

  it('offsets the header by DRAWER_W while the camera drawer is open', () => {
    const { container, getByTitle } = render(
      <Harness options={{ cameras: [cam('a', 1), cam('b', 2)] }} />,
    );
    const header = container.querySelector('header')!;
    expect(header.style.right).toBe('');
    fireEvent.click(getByTitle('toggleCameras'));
    expect(header.style.right).toBe(`${DRAWER_W}px`);
  });

  it('renders stage tabs and notifies the mode on stage change', () => {
    const onStageChange = vi.fn();
    const stages = [
      { stageId: 's1', name: 'Palco A', slug: 'a', position: 0, cameras: [cam('a', 1)] },
      { stageId: 's2', name: 'Palco B', slug: 'b', position: 1, cameras: [cam('b', 1)] },
    ];
    const { getByRole } = render(<Harness options={{ cameras: [], stages, onStageChange }} />);
    expect(onStageChange).toHaveBeenCalledTimes(1); // initial stage
    fireEvent.click(getByRole('tab', { name: /Palco B/ }));
    expect(onStageChange).toHaveBeenCalledTimes(2);
    expect(getByRole('tab', { name: /Palco B/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('shows chat and viewer chrome only when given', () => {
    const onToggle = vi.fn();
    const withChat = render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Player.Header badge="live" chat={{ open: false, onToggle, messageCount: 3 }} currentViewers={12} />
        <Player.Stage />
      </Harness>,
    );
    fireEvent.click(withChat.getByTitle('toggleChat'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    withChat.unmount();

    const without = render(<Harness options={{ cameras: [cam('a', 1)] }} />);
    expect(without.queryByTitle('toggleChat')).toBeNull();
  });

  it('exits to the event page', () => {
    const { getByLabelText } = render(<Harness options={{ cameras: [cam('a', 1)] }} />);
    fireEvent.click(getByLabelText('back'));
    expect(pushMock).toHaveBeenCalledWith('/events/evt-1');
  });

  it('hides the header while the pause ad is on screen', () => {
    const { container, getByTestId } = render(
      <Harness options={{ cameras: [cam('a', 1)], initialPaused: true }} />,
    );
    const header = container.querySelector('header')!;
    expect(header.className).not.toMatch(/headerHidden/);
    act(() => { fireEvent.click(getByTestId('fake-ad')); });
    expect(header.className).toMatch(/headerHidden/);
  });
});

// Player.Stage owns the player-mount-lifetime analytics (player_opened,
// playback_started, playback_buffered, playback_ended) — CameraGrid is
// stubbed above, so onPlaying/onBuffered are invoked directly off the
// captured props, the same way the real primary VideoPanel would call them.
describe('Player analytics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tracks player_opened once on mount, hasAccess:true', () => {
    render(<Harness options={{ cameras: [cam('a', 1)] }} />);
    const opens = mockTrack.mock.calls.filter(([name]) => name === 'player_opened');
    expect(opens).toEqual([['player_opened', { eventId: 'evt-1', mode: 'live', hasAccess: true }]]);
  });

  it('tracks player_opened exactly once under StrictMode (dev double-invoke)', () => {
    render(
      <StrictMode>
        <Harness options={{ cameras: [cam('a', 1)] }} />
      </StrictMode>,
    );
    const opens = mockTrack.mock.calls.filter(([name]) => name === 'player_opened');
    expect(opens).toHaveLength(1);
  });

  it('tracks playback_started once, on the first onPlaying call, with startupMs measured from mount', () => {
    render(<Harness options={{ cameras: [cam('a', 1)] }} />);
    vi.advanceTimersByTime(1234);

    act(() => lastGridProps().onPlaying?.('ll'));
    act(() => lastGridProps().onPlaying?.('standard')); // second 'playing' frame — must not re-fire

    const started = mockTrack.mock.calls.filter(([name]) => name === 'playback_started');
    expect(started).toHaveLength(1);
    expect(started[0]).toEqual([
      'playback_started',
      { eventId: 'evt-1', mode: 'live', quality: 'auto', latencyMode: 'll', startupMs: 1234 },
    ]);
  });

  it('tracks playback_buffered, throttled to at most one report per 10s', () => {
    render(<Harness options={{ cameras: [cam('a', 1)] }} />);

    act(() => lastGridProps().onBuffered?.(600));
    act(() => lastGridProps().onBuffered?.(700)); // within the 10s window — dropped
    vi.advanceTimersByTime(10_000);
    act(() => lastGridProps().onBuffered?.(800)); // window elapsed — reports again

    const buffered = mockTrack.mock.calls.filter(([name]) => name === 'playback_buffered');
    expect(buffered).toEqual([
      ['playback_buffered', { eventId: 'evt-1', durationMs: 600 }],
      ['playback_buffered', { eventId: 'evt-1', durationMs: 800 }],
    ]);
  });

  it('tracks playback_ended once on unmount, watchSeconds from the mount span', () => {
    const { unmount } = render(<Harness options={{ cameras: [cam('a', 1)] }} />);
    vi.advanceTimersByTime(5_000);
    unmount();
    vi.advanceTimersByTime(1); // flush the deferred emit (see Player.tsx)

    const ended = mockTrack.mock.calls.filter(([name]) => name === 'playback_ended');
    expect(ended).toEqual([['playback_ended', { eventId: 'evt-1', mode: 'live', watchSeconds: 5 }]]);
  });

  it('tracks playback_ended once even when pagehide fires before unmount', () => {
    const { unmount } = render(<Harness options={{ cameras: [cam('a', 1)] }} />);
    vi.advanceTimersByTime(3_000);
    act(() => window.dispatchEvent(new Event('pagehide')));
    unmount();
    vi.advanceTimersByTime(1);

    const ended = mockTrack.mock.calls.filter(([name]) => name === 'playback_ended');
    expect(ended).toEqual([['playback_ended', { eventId: 'evt-1', mode: 'live', watchSeconds: 3 }]]);
  });

  it('does not track playback_ended for a StrictMode dev double-invoke (phantom unmount)', () => {
    render(
      <StrictMode>
        <Harness options={{ cameras: [cam('a', 1)] }} />
      </StrictMode>,
    );
    vi.advanceTimersByTime(1); // flush any deferred emit from the phantom cleanup
    const ended = mockTrack.mock.calls.filter(([name]) => name === 'playback_ended');
    expect(ended).toHaveLength(0);
  });
});
