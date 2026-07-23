/**
 * Characterization suite (Etapa 0 do docs/review/video-panel-review.md).
 * Locks VideoPanel's CURRENT behavior before any extraction — hls.js, sonner
 * and analytics are mocked; the assertions describe what the component does
 * today, not what it should ideally do. If a refactor breaks one of these,
 * the refactor changed behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { VideoPanel } from './VideoPanel';
import type { LiveCamera } from '../types/live.types';

// ── hls.js mock ──────────────────────────────────────────────────────────────
const h = vi.hoisted(() => {
  const instances: MockHls[] = [];
  class MockHls {
    static isSupported = () => true;
    static Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      AUDIO_TRACKS_UPDATED: 'hlsAudioTracksUpdated',
      ERROR: 'hlsError',
    };
    static ErrorDetails = { BUFFER_STALLED_ERROR: 'bufferStalledError' };

    config: Record<string, unknown>;
    handlers = new Map<string, ((evt: string, data?: unknown) => void)[]>();
    levels: { height: number }[] = [];
    audioTracks: { id: number; name: string }[] = [];
    audioTrack = -1;
    currentLevel = -99; // sentinel: applyLevel must overwrite
    liveSyncPosition: number | undefined = undefined;
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();

    constructor(config: Record<string, unknown>) {
      this.config = config;
      instances.push(this);
    }
    on(evt: string, cb: (evt: string, data?: unknown) => void) {
      this.handlers.set(evt, [...(this.handlers.get(evt) ?? []), cb]);
    }
    emit(evt: string, data?: unknown) {
      for (const cb of this.handlers.get(evt) ?? []) cb(evt, data);
    }
  }
  return { MockHls, instances };
});

vi.mock('hls.js', () => ({ default: h.MockHls }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));
// i18n: characterization asserts behavior, not copy — echo the key.
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { toast } from 'sonner';
import { track } from '@/lib/analytics/analytics-client';

// ── jsdom media stubs ────────────────────────────────────────────────────────
const playMock = vi.fn<() => Promise<void>>(() => Promise.resolve());
const pauseMock = vi.fn();

beforeEach(() => {
  h.instances.length = 0;
  playMock.mockClear().mockImplementation(() => Promise.resolve());
  pauseMock.mockClear();
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true, writable: true, value: playMock,
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true, writable: true, value: pauseMock,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

const cam = (over: Partial<LiveCamera> = {}): LiveCamera => ({
  cameraId: 'cam-a',
  name: 'Câmera A',
  slug: 'camera-a',
  priority: 1,
  manifestPath: '/origin/pkg-1/master.m3u8',
  llPath: null,
  ...over,
});

const baseProps = {
  muted: true,
  onMutedChange: vi.fn(),
};

function lastHls() {
  return h.instances[h.instances.length - 1];
}

describe('VideoPanel characterization — hls build', () => {
  it('creates an hls instance on the STANDARD src with standard live tuning', () => {
    render(<VideoPanel camera={cam()} {...baseProps} />);
    expect(h.instances).toHaveLength(1);
    const hls = lastHls();
    expect(hls.loadSource).toHaveBeenCalledWith(expect.stringContaining('/origin/pkg-1/master.m3u8'));
    expect(hls.attachMedia).toHaveBeenCalled();
    expect(hls.config.lowLatencyMode).toBe(false);
    expect(hls.config.liveSyncDurationCount).toBe(3);
  });

  it('prefers the LL-HLS src with LL tuning when llPath is present (live)', () => {
    render(<VideoPanel camera={cam({ llPath: '/ll/sk-1/index.m3u8?token=t1' })} {...baseProps} />);
    const hls = lastHls();
    expect(hls.loadSource).toHaveBeenCalledWith(expect.stringContaining('/ll/sk-1/index.m3u8'));
    expect(hls.config.lowLatencyMode).toBe(true);
    expect(hls.config.liveSyncDurationCount).toBe(2);
  });

  it('shows the connecting state and builds nothing while manifestPath is null', () => {
    const { getByText } = render(<VideoPanel camera={cam({ manifestPath: null })} {...baseProps} />);
    expect(getByText('connecting')).toBeTruthy();
    expect(h.instances).toHaveLength(0);
  });

  it('destroys the hls instance on unmount', () => {
    const { unmount } = render(<VideoPanel camera={cam()} {...baseProps} />);
    const hls = lastHls();
    unmount();
    expect(hls.destroy).toHaveBeenCalled();
  });
});

describe('VideoPanel characterization — MANIFEST_PARSED', () => {
  it('reports levels sorted by height desc, applies selectedLevel and autoplays', () => {
    const onLevelsReady = vi.fn();
    render(
      <VideoPanel camera={cam()} {...baseProps} selectedLevel={1} onLevelsReady={onLevelsReady} />,
    );
    const hls = lastHls();
    hls.levels = [{ height: 480 }, { height: 1080 }, { height: 720 }];
    act(() => hls.emit(h.MockHls.Events.MANIFEST_PARSED));

    expect(onLevelsReady).toHaveBeenCalledWith([
      { index: 1, height: 1080 },
      { index: 2, height: 720 },
      { index: 0, height: 480 },
    ]);
    expect(hls.currentLevel).toBe(1);
    expect(playMock).toHaveBeenCalled();
  });

  it('pins lowQuality panels to the smallest rendition', () => {
    render(<VideoPanel camera={cam()} {...baseProps} lowQuality />);
    const hls = lastHls();
    hls.levels = [{ height: 1080 }, { height: 240 }, { height: 720 }];
    act(() => hls.emit(h.MockHls.Events.MANIFEST_PARSED));
    expect(hls.currentLevel).toBe(1);
  });

  it('replay does NOT autoplay when the shared paused state is already set', () => {
    render(<VideoPanel camera={cam()} {...baseProps} mode="replay" paused />);
    const hls = lastHls();
    pauseMock.mockClear();
    playMock.mockClear();
    act(() => hls.emit(h.MockHls.Events.MANIFEST_PARSED));
    expect(playMock).not.toHaveBeenCalled();
  });
});

describe('VideoPanel characterization — audio track selection', () => {
  it('applies the selected camera audio once AUDIO_TRACKS_UPDATED fires', () => {
    render(<VideoPanel camera={cam()} {...baseProps} selectedAudioCameraId="cam-b" />);
    const hls = lastHls();
    hls.audioTracks = [
      { id: 0, name: 'cam-a' },
      { id: 1, name: 'cam-b' },
    ];
    act(() => hls.emit(h.MockHls.Events.AUDIO_TRACKS_UPDATED));
    expect(hls.audioTrack).toBe(1);
  });

  it('keeps the manifest default when no track NAME matches', () => {
    render(<VideoPanel camera={cam()} {...baseProps} selectedAudioCameraId="cam-zz" />);
    const hls = lastHls();
    hls.audioTracks = [{ id: 0, name: 'cam-a' }];
    act(() => hls.emit(h.MockHls.Events.AUDIO_TRACKS_UPDATED));
    expect(hls.audioTrack).toBe(-1);
  });

  it('re-applies when selectedAudioCameraId changes after tracks exist', () => {
    const { rerender } = render(
      <VideoPanel camera={cam()} {...baseProps} selectedAudioCameraId="cam-a" />,
    );
    const hls = lastHls();
    hls.audioTracks = [
      { id: 0, name: 'cam-a' },
      { id: 1, name: 'cam-b' },
    ];
    act(() => hls.emit(h.MockHls.Events.AUDIO_TRACKS_UPDATED));
    expect(hls.audioTrack).toBe(0);
    rerender(<VideoPanel camera={cam()} {...baseProps} selectedAudioCameraId="cam-b" />);
    expect(hls.audioTrack).toBe(1);
  });
});

describe('VideoPanel characterization — LL fallback', () => {
  const llCam = () => cam({ llPath: '/ll/sk-1/index.m3u8?token=t1' });

  it('falls back to STANDARD after 3 buffer stalls within 30s, tracking the reason', () => {
    render(<VideoPanel camera={llCam()} {...baseProps} />);
    expect(h.instances).toHaveLength(1);
    const ll = lastHls();
    act(() => {
      for (let i = 0; i < 3; i++) {
        ll.emit(h.MockHls.Events.ERROR, {
          details: h.MockHls.ErrorDetails.BUFFER_STALLED_ERROR,
          fatal: false,
        });
      }
    });
    // Effect re-ran on the STANDARD src with standard tuning.
    expect(h.instances).toHaveLength(2);
    const std = lastHls();
    expect(std.loadSource).toHaveBeenCalledWith(expect.stringContaining('/origin/pkg-1/master.m3u8'));
    expect(std.config.lowLatencyMode).toBe(false);
    expect(ll.destroy).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'll_fallback_to_standard',
        entityId: 'cam-a',
        properties: expect.objectContaining({ reason: 'stalls' }),
      }),
    );
  });

  it('falls back to STANDARD on a fatal LL error (no toast, no error state)', () => {
    const { queryByText } = render(<VideoPanel camera={llCam()} {...baseProps} />);
    act(() => {
      lastHls().emit(h.MockHls.Events.ERROR, { details: 'levelLoadError', fatal: true });
    });
    expect(h.instances).toHaveLength(2);
    expect(toast.error).not.toHaveBeenCalled();
    expect(queryByText('noSignal')).toBeNull();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({ reason: 'fatal', detail: 'levelLoadError' }),
      }),
    );
  });

  it('a fatal STANDARD error shows the no-signal state and the lost-signal toast', () => {
    const { getByText } = render(<VideoPanel camera={cam()} {...baseProps} />);
    act(() => {
      lastHls().emit(h.MockHls.Events.ERROR, { details: 'levelLoadError', fatal: true });
    });
    expect(h.instances).toHaveLength(1); // no rebuild
    expect(getByText('noSignal')).toBeTruthy();
    expect(toast.error).toHaveBeenCalledWith('signalLostTitle', expect.any(Object));
  });
});

describe('VideoPanel characterization — element/prop sync', () => {
  it('syncs muted and volume onto the element', () => {
    const { container, rerender } = render(
      <VideoPanel camera={cam()} {...baseProps} muted volume={0.5} />,
    );
    const video = container.querySelector('video')!;
    expect(video.muted).toBe(true);
    expect(video.volume).toBe(0.5);
    rerender(<VideoPanel camera={cam()} {...baseProps} muted={false} volume={0.9} />);
    expect(video.muted).toBe(false);
    expect(video.volume).toBe(0.9);
  });

  it('mute button toggles via onMutedChange without selecting the panel', () => {
    const onMutedChange = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <VideoPanel camera={cam()} muted onMutedChange={onMutedChange} onSelect={onSelect} />,
    );
    fireEvent.click(container.querySelector('button')!);
    expect(onMutedChange).toHaveBeenCalledWith(false);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('VideoPanel characterization — replay controls', () => {
  it('paused prop drives pause/play on the element', () => {
    const { rerender } = render(
      <VideoPanel camera={cam()} {...baseProps} mode="replay" paused />,
    );
    expect(pauseMock).toHaveBeenCalled();
    rerender(<VideoPanel camera={cam()} {...baseProps} mode="replay" paused={false} />);
    expect(playMock).toHaveBeenCalled();
  });

  it('seekCommand applies currentTime, and a new token re-applies the same time', () => {
    const { container, rerender } = render(
      <VideoPanel camera={cam()} {...baseProps} mode="replay" seekCommand={{ time: 42, token: 1 }} />,
    );
    const video = container.querySelector('video')!;
    expect(video.currentTime).toBe(42);
    video.currentTime = 50;
    rerender(
      <VideoPanel camera={cam()} {...baseProps} mode="replay" seekCommand={{ time: 42, token: 2 }} />,
    );
    expect(video.currentTime).toBe(42);
  });

  it('only the time-source panel reports progress and ended', () => {
    const onProgress = vi.fn();
    const onEnded = vi.fn();
    const { container } = render(
      <VideoPanel
        camera={cam()} {...baseProps} mode="replay"
        isTimeSource onProgress={onProgress} onEnded={onEnded}
      />,
    );
    const video = container.querySelector('video')!;
    fireEvent(video, new Event('timeupdate'));
    expect(onProgress).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
    fireEvent(video, new Event('ended'));
    expect(onEnded).toHaveBeenCalled();
  });
});
