/**
 * Each control reads the shell from the Player context and drives the matching
 * setter — asserted through the DOM the viewer actually sees, not by spying on
 * the shell. Quality levels only exist once a CameraGrid reports them, so the
 * quality case mounts a Player.Stage whose (stubbed) grid reports two.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Player } from './Player';
import { Transport } from './Transport';
import { usePlayerShell } from '../../hooks/use-player-shell';
import type { UsePlayerShellOptions } from '../../hooks/use-player-shell';
import type { QualityLevel } from '../../hooks/use-hls-player';
import type { LiveCamera } from '../../types/live.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: true, user: null }) }));
vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));
vi.mock('../RecommendedOverlay', () => ({ RecommendedOverlay: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/advertisements/components/PauseAdTakeover', () => ({ PauseAdTakeover: () => null }));

// The stub reports a ladder on mount, which is the only way shell.quality gets
// levels — the quality menu does not exist until it does.
vi.mock('../CameraGrid', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../CameraGrid')>();
  const { useEffect } = await import('react');
  return {
    ...mod,
    CameraGrid: ({ onLevelsReady }: { onLevelsReady?: (levels: QualityLevel[]) => void }) => {
      useEffect(() => {
        onLevelsReady?.([{ index: 0, height: 720 }, { index: 1, height: 1080 }]);
      }, [onLevelsReady]);
      return <div data-testid="grid" />;
    },
  };
});

const cam = (cameraId: string, priority: number): LiveCamera => ({
  cameraId, name: `Cam ${cameraId}`, slug: cameraId, priority, manifestPath: `/live/${cameraId}.m3u8`, llPath: null, live: true, thumbnailUrl: null, coverage: [],
});

function Harness({ options, children }: { options: UsePlayerShellOptions; children: ReactNode }) {
  const shell = usePlayerShell(options);
  return (
    <Player.Root shell={shell} mode="live" eventId="evt-1" title="Show">
      <Player.Transport>{children}</Player.Transport>
    </Player.Root>
  );
}

beforeEach(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

describe('Transport controls', () => {
  it('renders whatever badge it is given, in declaration order', () => {
    const { container } = render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Transport.Play />
        <Transport.Badge><span>BADGE</span></Transport.Badge>
        <Transport.Spacer />
        <Transport.Fullscreen />
      </Harness>,
    );
    const labels = Array.from(container.querySelectorAll('button, span')).map((el) => el.textContent);
    expect(labels).toContain('BADGE');
    const play = container.querySelector('[aria-label="pause"]')!;
    const badge = container.querySelector('span')!;
    expect(play.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Play toggles shell.paused', () => {
    const { getByLabelText, queryByLabelText } = render(
      <Harness options={{ cameras: [cam('a', 1)] }}><Transport.Play /></Harness>,
    );
    fireEvent.click(getByLabelText('pause'));
    expect(getByLabelText('play')).toBeTruthy();
    expect(queryByLabelText('pause')).toBeNull();
  });

  it('Scrubber spans the given range and reports seeks', () => {
    const onSeek = vi.fn();
    const { getByLabelText, getByText } = render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Transport.Scrubber min={0} max={3606} value={1200} onSeek={onSeek} leadingLabel="-40:00" trailingLabel="60:06" />
      </Harness>,
    );
    const slider = getByLabelText('seekPosition') as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('3606');
    expect(slider.value).toBe('1200');
    expect(getByText('-40:00')).toBeTruthy();
    expect(getByText('60:06')).toBeTruthy();
    fireEvent.change(slider, { target: { value: '900' } });
    expect(onSeek).toHaveBeenCalledWith(900);
  });

  it('Volume drives shell.audio.setGlobalMuted and setVolume', () => {
    const { getByLabelText } = render(
      <Harness options={{ cameras: [cam('a', 1)] }}><Transport.Volume /></Harness>,
    );
    fireEvent.click(getByLabelText('mute'));
    expect(getByLabelText('unmute')).toBeTruthy();
    // Moving the slider both sets the volume and lifts the mute.
    fireEvent.change(getByLabelText('volume'), { target: { value: '0.4' } });
    expect((getByLabelText('volume') as HTMLInputElement).value).toBe('0.4');
    expect(getByLabelText('mute')).toBeTruthy();
  });

  it('AudioCamera only appears with more than one camera, and unmutes on pick', () => {
    const single = render(
      <Harness options={{ cameras: [cam('a', 1)] }}><Transport.AudioCamera /><Transport.Volume /></Harness>,
    );
    expect(single.queryByLabelText('chooseAudioCamera')).toBeNull();
    single.unmount();

    const { getByLabelText, getByText } = render(
      <Harness options={{ cameras: [cam('a', 1), cam('b', 2)], initialAudio: { muted: true, volume: 1 } }}>
        <Transport.AudioCamera />
        <Transport.Volume />
      </Harness>,
    );
    expect(getByLabelText('unmute')).toBeTruthy();
    fireEvent.click(getByLabelText('chooseAudioCamera'));
    fireEvent.click(getByText('Cam b'));
    // handleAudioCameraChange treats picking a source as "I want to hear this".
    expect(getByLabelText('mute')).toBeTruthy();
  });

  it('Quality lists the reported ladder and applies the pick', () => {
    function QualityHarness() {
      const shell = usePlayerShell({ cameras: [cam('a', 1)] });
      return (
        <Player.Root shell={shell} mode="live" eventId="evt-1" title="Show">
          <Player.Stage />
          <Player.Transport><Transport.Quality /></Player.Transport>
        </Player.Root>
      );
    }
    const { getByText } = render(<QualityHarness />);
    fireEvent.click(getByText('Auto'));
    fireEvent.click(getByText('720p'));
    expect(getByText('720p')).toBeTruthy();
  });

  it('Pip and Fullscreen call the shell handlers', () => {
    const { getByLabelText } = render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Transport.Pip />
        <Transport.Fullscreen />
      </Harness>,
    );
    // jsdom has no PiP/fullscreen API; the shell hooks swallow that. What this
    // asserts is that the controls exist, are wired, and don't throw.
    expect(() => fireEvent.click(getByLabelText('Picture-in-Picture'))).not.toThrow();
    expect(() => fireEvent.click(getByLabelText('enterFullscreen'))).not.toThrow();
  });
});
