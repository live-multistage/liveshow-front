import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Hls from 'hls.js';
import { resolveStartSeek, watchStuckStart } from './hls-start-watchdog';

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
      config: { liveMaxLatencyDurationCount: 8 },
    } as unknown as Hls;
    video = { readyState: 1, currentTime: 0 } as HTMLVideoElement;
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const created = (data: unknown) => handlers['hlsBufferCreated'](null, data);

  it('logs each track and seeks back to audio that stays behind, lifting the catch-up', () => {
    watchStuckStart(hls, video, 'cam');
    created(buffers([[300, 310]], [[208, 218]]));

    vi.advanceTimersByTime(4000);
    expect(video.currentTime).toBe(0);

    vi.advanceTimersByTime(1000);
    expect(video.currentTime).toBe(208);
    expect(hls.config.liveMaxLatencyDurationCount).toBe(Infinity);
    expect(warn).toHaveBeenCalledTimes(1);
    const line = warn.mock.calls[0][0] as string;
    expect(line).toContain('[hls-start-watchdog] camera=cam');
    expect(line).toContain('video=[[300,310]]');
    expect(line).toContain('audio=[[208,218]]');
  });

  it('logs once and waits for audio ahead, then seeks into the overlap keeping the catch-up', () => {
    watchStuckStart(hls, video, 'cam');
    const data = buffers([[300, 310]], [[392, 402]]);
    created(data);
    vi.advanceTimersByTime(60_000);
    expect(video.currentTime).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);

    data.tracks.video.buffer.buffered = timeRanges([[300, 394]]);
    vi.advanceTimersByTime(1000);
    expect(video.currentTime).toBe(392);
    expect(hls.config.liveMaxLatencyDurationCount).toBe(8);
  });

  it('leaves a slow first segment alone', () => {
    watchStuckStart(hls, video, 'cam');
    created(buffers([], []));
    vi.advanceTimersByTime(60_000);
    expect(video.currentTime).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it('stops for good once playback has started', () => {
    watchStuckStart(hls, video, 'cam');
    created(buffers([[300, 310]], [[208, 218]]));
    (video as { readyState: number }).readyState = 2;
    vi.advanceTimersByTime(1000);
    (video as { readyState: number }).readyState = 1;
    vi.advanceTimersByTime(60_000);
    expect(warn).not.toHaveBeenCalled();
  });

  it('gives up after a bounded number of seeks', () => {
    watchStuckStart(hls, video, 'cam');
    created(buffers([[300, 310]], [[208, 218]]));
    vi.advanceTimersByTime(600_000);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('stops when the hls instance is torn down', () => {
    const stop = watchStuckStart(hls, video, 'cam');
    created(buffers([[300, 310]], [[208, 218]]));
    stop();
    vi.advanceTimersByTime(60_000);
    expect(warn).not.toHaveBeenCalled();
  });
});
