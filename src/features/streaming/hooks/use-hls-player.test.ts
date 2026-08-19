/**
 * Signed-URL (?pt) token-refresh behavior for the live STANDARD path.
 * The playback query refreshes `camera.manifestPath`'s `?pt` token every 5s;
 * the player must NOT rebuild on that refresh (only on a real source change)
 * and every hls.js request must carry the freshest token. hls.js is mocked —
 * these assertions lock the token wiring, not real network behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import {
  extractPt,
  stripPt,
  replacePtParam,
  maxLatencyDurationCount,
  useHlsPlayer,
} from './use-hls-player';
import type { LiveCamera } from '../types/live.types';

// ── hls.js mock ──────────────────────────────────────────────────────────────
const h = vi.hoisted(() => {
  const instances: MockHls[] = [];
  class MockHls {
    static isSupported = () => true;
    static Events = { MANIFEST_PARSED: 'm', AUDIO_TRACKS_UPDATED: 'a', ERROR: 'e' };
    static ErrorDetails = { BUFFER_STALLED_ERROR: 'b' };
    config: Record<string, unknown>;
    levels: { height: number }[] = [];
    audioTracks: { id: number; name: string }[] = [];
    audioTrack = -1;
    currentLevel = -1;
    liveSyncPosition: number | undefined = undefined;
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    on = vi.fn();
    constructor(config: Record<string, unknown>) {
      this.config = config;
      instances.push(this);
    }
  }
  return { MockHls, instances };
});
vi.mock('hls.js', () => ({ default: h.MockHls }));

// ── pure helpers ─────────────────────────────────────────────────────────────
describe('pt helpers', () => {
  it('extractPt reads the token, null when absent', () => {
    expect(extractPt('/o/master.m3u8?pt=abc')).toBe('abc');
    expect(extractPt('/o/master.m3u8')).toBeNull();
    expect(extractPt('/o/master.m3u8?foo=1')).toBeNull();
  });

  it('stripPt drops only pt (stable build key)', () => {
    expect(stripPt('/o/master.m3u8?pt=abc')).toBe('/o/master.m3u8');
    expect(stripPt('/o/master.m3u8?a=1&pt=abc')).toBe('/o/master.m3u8?a=1');
    expect(stripPt('/o/master.m3u8')).toBe('/o/master.m3u8');
  });

  it('replacePtParam swaps the token, falls through gracefully', () => {
    expect(replacePtParam('/s?pt=old', 'new')).toBe('/s?pt=new');
    expect(replacePtParam('/s?a=1&pt=old', 'new')).toBe('/s?a=1&pt=new');
    expect(replacePtParam('/s', 'new')).toBe('/s'); // no pt → unchanged
    expect(replacePtParam('/s?pt=old', null)).toBe('/s?pt=old'); // no token → unchanged
    // JWT dots survive the round-trip (not percent-encoded).
    expect(replacePtParam('/s?pt=x', 'aaa.bbb.ccc')).toBe('/s?pt=aaa.bbb.ccc');
  });
});

// ── build / token-refresh wiring ─────────────────────────────────────────────
const cam = (over: Partial<LiveCamera> = {}): LiveCamera => ({
  cameraId: 'cam-a',
  name: 'Câmera A',
  slug: 'camera-a',
  priority: 1,
  manifestPath: '/origin/pkg-1/master.m3u8?pt=t1',
  llPath: null,
  ...over,
});

function renderPlayer(camera: LiveCamera, dvrActive = false) {
  const videoRef = {
    current: document.createElement('video'),
  } as RefObject<HTMLVideoElement | null>;
  return renderHook(
    ({ camera, dvrActive }: { camera: LiveCamera; dvrActive?: boolean }) =>
      useHlsPlayer({
        videoRef,
        camera,
        mode: 'live',
        isFocused: false,
        dvrActive,
        lowQuality: false,
      }),
    { initialProps: { camera, dvrActive } },
  );
}

// ── DVR: hls.js's forced catch-up to the live edge ───────────────────────────
describe('useHlsPlayer — DVR latency relaxation', () => {
  beforeEach(() => {
    h.instances.length = 0;
  });

  it('keeps the tuned catch-up window while playing at the live edge', () => {
    expect(maxLatencyDurationCount(false, false)).toBe(8);
    expect(maxLatencyDurationCount(true, false)).toBe(5);
    renderPlayer(cam());
    expect(h.instances[0].config.liveMaxLatencyDurationCount).toBe(8);
  });

  it('lifts it once the viewer scrubs back, so hls.js stops yanking them forward', () => {
    expect(maxLatencyDurationCount(false, true)).toBe(Infinity);
    const { rerender } = renderPlayer(cam());
    rerender({ camera: cam(), dvrActive: true });
    expect(h.instances).toHaveLength(1); // relaxed in place, no rebuild
    expect(h.instances[0].config.liveMaxLatencyDurationCount).toBe(Infinity);
  });

  it('restores it on return to live', () => {
    const { rerender } = renderPlayer(cam(), true);
    expect(h.instances[0].config.liveMaxLatencyDurationCount).toBe(Infinity);
    rerender({ camera: cam(), dvrActive: false });
    expect(h.instances[0].config.liveMaxLatencyDurationCount).toBe(8);
  });
});

describe('useHlsPlayer — signed-URL token refresh (live standard)', () => {
  beforeEach(() => {
    h.instances.length = 0;
  });

  it('does NOT rebuild the hls instance on a token-only manifestPath change', () => {
    const { rerender } = renderPlayer(cam({ manifestPath: '/origin/pkg-1/master.m3u8?pt=t1' }));
    expect(h.instances).toHaveLength(1);
    // same packageId + path, fresh token (the 5s poll)
    rerender({ camera: cam({ manifestPath: '/origin/pkg-1/master.m3u8?pt=t2' }) });
    expect(h.instances).toHaveLength(1);
    expect(h.instances[0].destroy).not.toHaveBeenCalled();
  });

  it('DOES rebuild on a real packageId/path change (job rotation)', () => {
    const { rerender } = renderPlayer(cam({ manifestPath: '/origin/pkg-1/master.m3u8?pt=t1' }));
    expect(h.instances).toHaveLength(1);
    rerender({ camera: cam({ manifestPath: '/origin/pkg-2/master.m3u8?pt=t2' }) });
    expect(h.instances).toHaveLength(2);
    expect(h.instances[0].destroy).toHaveBeenCalled();
  });

  it('xhrSetup rewrites an outgoing request URL pt to the current token', () => {
    renderPlayer(cam({ manifestPath: '/origin/pkg-1/master.m3u8?pt=CURRENT' }));
    const xhrSetup = h.instances[0].config.xhrSetup as (
      xhr: XMLHttpRequest,
      url: string,
    ) => void;
    expect(xhrSetup).toBeTypeOf('function');
    const xhr = { open: vi.fn() } as unknown as XMLHttpRequest;
    // a segment URL whose baked-in token is stale
    xhrSetup(xhr, 'https://cdn.example/origin/pkg-1/seg_0.ts?pt=STALE');
    expect(xhr.open).toHaveBeenCalledWith(
      'GET',
      'https://cdn.example/origin/pkg-1/seg_0.ts?pt=CURRENT',
      true,
    );
  });

  it('xhrSetup uses the freshest token after a refresh (without rebuilding)', () => {
    const { rerender } = renderPlayer(cam({ manifestPath: '/origin/pkg-1/master.m3u8?pt=t1' }));
    rerender({ camera: cam({ manifestPath: '/origin/pkg-1/master.m3u8?pt=t2' }) });
    expect(h.instances).toHaveLength(1); // no rebuild
    const xhrSetup = h.instances[0].config.xhrSetup as (
      xhr: XMLHttpRequest,
      url: string,
    ) => void;
    const xhr = { open: vi.fn() } as unknown as XMLHttpRequest;
    xhrSetup(xhr, 'https://x/seg?pt=old');
    expect(xhr.open).toHaveBeenCalledWith('GET', 'https://x/seg?pt=t2', true);
  });

  it('does not add xhrSetup on the LL path (left untouched)', () => {
    renderPlayer(cam({ llPath: '/ll/sk-1/index.m3u8?token=t1' }));
    // hasLl true → LL tuning, no live-standard pt rewrite
    expect(h.instances[0].config.lowLatencyMode).toBe(true);
    expect(h.instances[0].config.xhrSetup).toBeUndefined();
  });
});

// ── native HLS (iOS Safari) live token refresh ──────────────────────────────
// No hls.js instance exists on this path (Hls.isSupported() is false), so
// there is no xhrSetup to rewrite `pt`. The hook instead re-points video.src
// on a ~60s interval, well under the 90s token TTL.
function renderNativePlayer(camera: LiveCamera, mode: 'live' | 'replay' = 'live') {
  const video = document.createElement('video');
  video.canPlayType = vi.fn(() => 'maybe') as HTMLVideoElement['canPlayType'];
  const videoRef = { current: video } as RefObject<HTMLVideoElement | null>;
  const view = renderHook(
    ({ camera }: { camera: LiveCamera }) =>
      useHlsPlayer({ videoRef, camera, mode, isFocused: false, lowQuality: false }),
    { initialProps: { camera } },
  );
  return { ...view, video };
}

describe('useHlsPlayer — native HLS (iOS Safari) live token refresh', () => {
  beforeEach(() => {
    h.instances.length = 0;
    h.MockHls.isSupported = vi.fn(() => false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    h.MockHls.isSupported = () => true;
  });

  it('re-points video.src to the fresh token after ~60s when it changed', () => {
    const { rerender, video } = renderNativePlayer(
      cam({ manifestPath: '/origin/pkg-1/master.m3u8?pt=t1' }),
    );
    expect(video.src).toContain('pt=t1');
    rerender({ camera: cam({ manifestPath: '/origin/pkg-1/master.m3u8?pt=t2' }) });
    vi.advanceTimersByTime(60_000);
    expect(video.src).toContain('pt=t2');
  });

  it('does NOT reassign src when the token is unchanged', () => {
    const { video } = renderNativePlayer(cam({ manifestPath: '/origin/pkg-1/master.m3u8?pt=t1' }));
    const before = video.src;
    vi.advanceTimersByTime(60_000);
    expect(video.src).toBe(before);
  });

  it('clears the refresh interval on unmount', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = renderNativePlayer(cam());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('does NOT set up a refresh interval for replay (closed VOD timeline)', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    renderNativePlayer(cam(), 'replay');
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
