import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Hls from 'hls.js';
import { isHeldBehindLive, reachableLivePosition, resolveStartSeek, watchStuckStart } from './hls-start-watchdog';

const timeRanges = (ranges: [number, number][]) => ({
  length: ranges.length,
  start: (i: number) => ranges[i][0],
  end: (i: number) => ranges[i][1],
});

describe('resolveStartSeek', () => {
  it('waits while a track has no data', () => {
    expect(resolveStartSeek([], [])).toBeNull();
    expect(resolveStartSeek([[352, 380]], [])).toBeNull();
  });

  it('goes to the start of a real overlap', () => {
    expect(resolveStartSeek([[352, 380]], [[370, 400]])).toBe(370);
    expect(resolveStartSeek([[370, 400]], [[352, 380]])).toBe(370);
  });

  it('finds an overlap past the first range', () => {
    expect(resolveStartSeek([[10, 20], [352, 380]], [[370, 400]])).toBe(370);
  });

  it('prefers the newest overlap: the old stretch is the worst place to fall back to', () => {
    expect(resolveStartSeek([[232, 398]], [[232, 248], [306, 316]])).toBe(306);
  });

  it('goes back to audio that is behind the video', () => {
    expect(resolveStartSeek([[300, 310]], [[208, 218]])).toBe(208);
    expect(resolveStartSeek([[300, 310]], [[134, 138], [208, 218]])).toBe(208);
  });

  it('waits for audio that is ahead of the video: a seek there would be clamped', () => {
    expect(resolveStartSeek([[300, 310]], [[392, 402]])).toBeNull();
  });
});

describe('watchStuckStart', () => {
  let handlers: Record<string, (event: unknown, data: unknown) => void>;
  let hls: Hls;
  let video: HTMLVideoElement;
  let warn: ReturnType<typeof vi.spyOn>;
  let onHeldChange: ReturnType<typeof vi.fn<(held: boolean) => void>>;
  const buffers = (video_: [number, number][], audio: [number, number][]) => ({
    tracks: {
      video: { buffer: { buffered: timeRanges(video_) } },
      audio: { buffer: { buffered: timeRanges(audio) } },
    },
  });

  beforeEach(() => {
    vi.useFakeTimers();
    handlers = {};
    hls = {
      on: (event: string, fn: (event: unknown, data: unknown) => void) => {
        handlers[event] = fn;
      },
      liveSyncPosition: 400,
    } as unknown as Hls;
    onHeldChange = vi.fn<(held: boolean) => void>();
    video = Object.assign(new EventTarget(), { readyState: 1, currentTime: 0, buffered: timeRanges([]) }) as unknown as HTMLVideoElement;
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const created = (data: unknown) => handlers['hlsBufferCreated'](null, data);

  it('logs each track and seeks back to audio that stays behind, lifting the catch-up', () => {
    watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange });
    created(buffers([[300, 310]], [[208, 218]]));

    vi.advanceTimersByTime(4000);
    expect(video.currentTime).toBe(0);

    vi.advanceTimersByTime(1000);
    expect(video.currentTime).toBe(208);
    expect(onHeldChange).toHaveBeenCalledWith(true);
    expect(isHeldBehindLive(hls)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    const line = warn.mock.calls[0][0] as string;
    expect(line).toContain('[hls-start-watchdog] camera=cam');
    expect(line).toContain('video=[[300,310]]');
    expect(line).toContain('audio=[[208,218]]');
  });

  it('logs once and waits for audio ahead, then seeks into the overlap keeping the catch-up', () => {
    watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange });
    const data = buffers([[300, 310]], [[392, 402]]);
    created(data);
    vi.advanceTimersByTime(60_000);
    expect(video.currentTime).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);

    data.tracks.video.buffer.buffered = timeRanges([[300, 394]]);
    vi.advanceTimersByTime(1000);
    expect(video.currentTime).toBe(392);
    expect(onHeldChange).not.toHaveBeenCalled();
  });

  it('leaves a slow first segment alone', () => {
    watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange });
    created(buffers([], []));
    vi.advanceTimersByTime(60_000);
    expect(video.currentTime).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it('stops for good once playback has started', () => {
    watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange });
    created(buffers([[300, 310]], [[208, 218]]));
    (video as { readyState: number }).readyState = 2;
    vi.advanceTimersByTime(1000);
    (video as { readyState: number }).readyState = 1;
    vi.advanceTimersByTime(60_000);
    expect(warn).not.toHaveBeenCalled();
  });

  it('gives up after a bounded number of seeks', () => {
    watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange });
    created(buffers([[300, 310]], [[208, 218]]));
    vi.advanceTimersByTime(600_000);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  const holdAt = (position: number) => {
    created(buffers([[300, 310]], [[208, 218]]));
    vi.advanceTimersByTime(5000); // held, seeked to 208
    Object.assign(video, { readyState: 4, currentTime: position, buffered: timeRanges([[230, 250]]) });
    vi.advanceTimersByTime(1000); // playing: the watchdog disarms
    onHeldChange.mockClear();
    warn.mockClear();
  };
  const seekTo = (position: number, readyState: number) => {
    Object.assign(video, { currentTime: position, readyState });
    video.dispatchEvent(new Event('seeking'));
  };

  it('a seek of a held panel that gets stuck falls back to the newest stretch that plays', () => {
    watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange });
    holdAt(240);
    created(buffers([[232, 398]], [[232, 248], [306, 316]]));
    seekTo(396, 1); // "Live": the tracks still don't meet there
    vi.advanceTimersByTime(5000);
    expect(video.currentTime).toBe(306);
    expect(isHeldBehindLive(hls)).toBe(true);
  });

  it('lifts the hold once a seek plays at the edge again', () => {
    watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange });
    holdAt(240);
    seekTo(398, 4);
    vi.advanceTimersByTime(1000);
    expect(onHeldChange).toHaveBeenCalledWith(false);
    expect(isHeldBehindLive(hls)).toBe(false);
  });

  it('a held panel sent to the edge asks for a new hls instance', () => {
    const onEdgeRequested = vi.fn();
    watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange, onEdgeRequested });
    holdAt(240);
    seekTo(398, 1);
    expect(onEdgeRequested).toHaveBeenCalledTimes(1);
  });

  it('stays held after a seek that plays far behind the edge', () => {
    watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange });
    holdAt(240);
    seekTo(245, 4);
    vi.advanceTimersByTime(1000);
    expect(onHeldChange).not.toHaveBeenCalled();
    expect(isHeldBehindLive(hls)).toBe(true);
  });

  it('stops when the hls instance is torn down', () => {
    const stop = watchStuckStart(hls, video, { cameraId: 'cam', onHeldChange });
    created(buffers([[300, 310]], [[208, 218]]));
    stop();
    vi.advanceTimersByTime(60_000);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('reachableLivePosition', () => {
  const video = (currentTime: number, ranges: [number, number][]) =>
    ({ currentTime, buffered: timeRanges(ranges) }) as unknown as HTMLVideoElement;

  it('is the live sync point for a panel that is not held', () => {
    expect(reachableLivePosition(video(300, [[290, 310]]), { liveSyncPosition: 400 } as unknown as Hls)).toBe(400);
  });

  it('is unbounded while hls.js has no sync point', () => {
    expect(reachableLivePosition(video(0, []), null)).toBe(Infinity);
  });

  it('stops short of the end of both tracks for a held panel', () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handlers: Record<string, (event: unknown, data: unknown) => void> = {};
    const hls = { liveSyncPosition: 400, on: (e: string, fn: (event: unknown, data: unknown) => void) => { handlers[e] = fn; } } as unknown as Hls;
    const v = Object.assign(new EventTarget(), { readyState: 1, currentTime: 0, buffered: timeRanges([]) }) as unknown as HTMLVideoElement;
    watchStuckStart(hls, v, { cameraId: 'cam' });
    handlers['hlsBufferCreated'](null, {
      tracks: { video: { buffer: { buffered: timeRanges([[300, 310]]) } }, audio: { buffer: { buffered: timeRanges([[208, 218]]) } } },
    });
    vi.advanceTimersByTime(5000);
    Object.assign(v, { currentTime: 240, buffered: timeRanges([[230, 250]]) });
    expect(reachableLivePosition(v, hls)).toBe(249);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
