import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type Hls from 'hls.js';
import { resolveClockCorrection, useClockSync } from './use-clock-sync';
import type { ClockSample } from './use-clock-sync';
import { watchStuckStart } from './hls-start-watchdog';

describe('resolveClockCorrection', () => {
  it('leaves followers alone within half a frame (±20ms)', () => {
    expect(resolveClockCorrection(0)).toEqual({ type: 'none' });
    expect(resolveClockCorrection(0.015)).toEqual({ type: 'none' });
    expect(resolveClockCorrection(-0.02)).toEqual({ type: 'none' });
  });

  it('nudges in proportion to the drift, at least 1%', () => {
    expect(resolveClockCorrection(0.03)).toEqual({ type: 'rate', rate: 1.015 });
    expect(resolveClockCorrection(-0.06)).toEqual({ type: 'rate', rate: 0.97 });
    expect(resolveClockCorrection(0.021)).toEqual({ type: 'rate', rate: 1.0105 });
  });

  it('never moves past the dead zone between two checks (0.5s)', () => {
    for (const drift of [0.025, 0.04, 0.08, 0.2, 1]) {
      const c = resolveClockCorrection(drift);
      if (c.type !== 'rate') throw new Error('expected a rate nudge');
      expect(drift - (c.rate - 1) * 0.5).toBeGreaterThan(-0.02);
    }
  });

  it('speeds up a follower that is behind the master', () => {
    expect(resolveClockCorrection(0.5)).toEqual({ type: 'rate', rate: 1.05 });
  });

  it('slows down a follower that is ahead of the master', () => {
    expect(resolveClockCorrection(-0.5)).toEqual({ type: 'rate', rate: 0.95 });
  });

  it('hard-seeks past the nudge range (±1.5s), both directions', () => {
    expect(resolveClockCorrection(2)).toEqual({ type: 'seek' });
    expect(resolveClockCorrection(-3)).toEqual({ type: 'seek' });
    expect(resolveClockCorrection(1.5)).toEqual({ type: 'seek' });
  });
});

describe('useClockSync — master', () => {
  const SEGMENT_ZERO = Date.parse('2026-11-02T20:00:00Z');

  const makeClock = () => ({ current: null } as MutableRefObject<ClockSample | null>);
  const renderMaster = (
    video: Partial<HTMLVideoElement>,
    hls: Partial<Hls> | null,
    clockRef: MutableRefObject<ClockSample | null>,
  ) =>
    renderHook(() =>
      useClockSync({
        videoRef: { current: video as HTMLVideoElement },
        hlsRef: { current: hls as Hls | null },
        mode: 'live',
        role: 'master',
        clockRef,
      }),
    );
  const playingDate = new Date(SEGMENT_ZERO);

  it('publishes nothing while stuck at currentTime 0 before the start gate', () => {
    const clockRef = makeClock();
    renderMaster(
      { paused: false, seeking: false, readyState: 1, currentTime: 0 },
      { playingDate, hasEnoughToStart: false },
      clockRef,
    );
    expect(clockRef.current).toBeNull();
  });

  it('publishes nothing past the gate until it has a frame', () => {
    const clockRef = makeClock();
    renderMaster(
      { paused: false, seeking: false, readyState: 1, currentTime: 368 },
      { playingDate, hasEnoughToStart: true },
      clockRef,
    );
    expect(clockRef.current).toBeNull();
  });

  it('publishes the playing date once it really started', () => {
    const clockRef = makeClock();
    renderMaster(
      { paused: false, seeking: false, readyState: 4, currentTime: 368 },
      { playingDate, hasEnoughToStart: true },
      clockRef,
    );
    expect(clockRef.current?.epochMs).toBe(SEGMENT_ZERO);
  });

  it('publishes nothing while held behind live by the start watchdog', () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handlers: Record<string, (event: unknown, data: unknown) => void> = {};
    const hls = {
      playingDate,
      hasEnoughToStart: false,
      config: {},
      on: (event: string, fn: (event: unknown, data: unknown) => void) => {
        handlers[event] = fn;
      },
    };
    const video = Object.assign(new EventTarget(), { paused: false, seeking: false, readyState: 1, currentTime: 0 });
    watchStuckStart(hls as unknown as Hls, video as unknown as HTMLVideoElement, { cameraId: 'cam' });
    const ranges = (start: number, end: number) => ({ length: 1, start: () => start, end: () => end });
    handlers['hlsBufferCreated'](null, {
      tracks: { video: { buffer: { buffered: ranges(300, 310) } }, audio: { buffer: { buffered: ranges(208, 218) } } },
    });
    vi.advanceTimersByTime(5000);
    hls.hasEnoughToStart = true;
    video.readyState = 4;

    const clockRef = makeClock();
    renderMaster(video as unknown as Partial<HTMLVideoElement>, hls as unknown as Partial<Hls>, clockRef);
    expect(clockRef.current).toBeNull();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('replay keeps publishing from its coverage: it has no hls start gate to wait for', () => {
    const clockRef = makeClock();
    renderHook(() =>
      useClockSync({
        videoRef: { current: { paused: false, seeking: false, readyState: 1, currentTime: 5 } as HTMLVideoElement },
        hlsRef: { current: null },
        mode: 'replay',
        role: 'master',
        clockRef,
        coverage: [{ startsAtMs: SEGMENT_ZERO, endsAtMs: SEGMENT_ZERO + 60_000, localStartSec: 0 }],
      }),
    );
    expect(clockRef.current?.epochMs).toBe(SEGMENT_ZERO + 5000);
  });
});

describe('useClockSync — follower', () => {
  const MASTER_AT = Date.parse('2026-11-02T20:05:00Z');

  function renderFollower(video: Partial<HTMLVideoElement>, hls: Partial<Hls>) {
    const clockRef = { current: { epochMs: MASTER_AT, sampledAt: performance.now() } } as MutableRefObject<ClockSample | null>;
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    renderHook(() =>
      useClockSync({
        videoRef: { current: video as HTMLVideoElement },
        hlsRef: { current: hls as Hls },
        mode: 'live',
        role: 'follower',
        clockRef,
      }),
    );
    vi.advanceTimersByTime(500);
    vi.useRealTimers();
  }

  const seekable = (end: number) => ({ length: 1, start: () => 0, end: () => end });

  it('does not chase a master it cannot reach: stays at its own live sync point', () => {
    // 6 s behind the master, but its sync point is only 1 s ahead (long GOP).
    const video = { paused: false, seeking: false, currentTime: 300, playbackRate: 1, seekable: seekable(320) };
    renderFollower(video as Partial<HTMLVideoElement>, { playingDate: new Date(MASTER_AT - 6000), liveSyncPosition: 301 });
    expect(video.currentTime).toBe(300);
    expect(video.playbackRate).toBeLessThanOrEqual(1.05);
    expect(video.playbackRate).toBeGreaterThan(1);
  });

  it('holds at its sync point instead of nudging past it', () => {
    const video = { paused: false, seeking: false, currentTime: 301, playbackRate: 1.05, seekable: seekable(320) };
    renderFollower(video as Partial<HTMLVideoElement>, { playingDate: new Date(MASTER_AT - 6000), liveSyncPosition: 301 });
    expect(video.currentTime).toBe(301);
    expect(video.playbackRate).toBe(1);
  });

  it('still seeks to a master within reach', () => {
    const video = { paused: false, seeking: false, currentTime: 300, playbackRate: 1, seekable: seekable(320) };
    renderFollower(video as Partial<HTMLVideoElement>, { playingDate: new Date(MASTER_AT - 6000), liveSyncPosition: 310 });
    expect(video.currentTime).toBeCloseTo(306, 0);
  });
});

describe('useClockSync — held follower', () => {
  it('chases a master only as far as both of its tracks reach', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();
    const handlers: Record<string, (event: unknown, data: unknown) => void> = {};
    const ranges = (list: [number, number][]) => ({ length: list.length, start: (i: number) => list[i][0], end: (i: number) => list[i][1] });
    const hls = {
      playingDate: new Date(Date.parse('2026-11-02T20:00:00Z')),
      liveSyncPosition: 400,
      on: (e: string, fn: (event: unknown, data: unknown) => void) => { handlers[e] = fn; },
    };
    const video = Object.assign(new EventTarget(), { paused: false, seeking: false, readyState: 1, currentTime: 0, playbackRate: 1, buffered: ranges([]), seekable: ranges([[0, 420]]) });
    watchStuckStart(hls as unknown as Hls, video as unknown as HTMLVideoElement, { cameraId: 'cam' });
    handlers['hlsBufferCreated'](null, { tracks: { video: { buffer: { buffered: ranges([[300, 310]]) } }, audio: { buffer: { buffered: ranges([[208, 218]]) } } } });
    vi.advanceTimersByTime(5000);
    Object.assign(video, { readyState: 4, currentTime: 240, buffered: ranges([[230, 250]]) });
    vi.advanceTimersByTime(1000);

    // Demoted: the new master is ~90 s ahead.
    const clockRef = { current: { epochMs: hls.playingDate.getTime() + 90_000, sampledAt: performance.now() } } as MutableRefObject<ClockSample | null>;
    renderHook(() => useClockSync({ videoRef: { current: video as unknown as HTMLVideoElement }, hlsRef: { current: hls as unknown as Hls }, mode: 'live', role: 'follower', clockRef }));
    vi.advanceTimersByTime(500);
    expect(video.currentTime).toBeLessThanOrEqual(249);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
