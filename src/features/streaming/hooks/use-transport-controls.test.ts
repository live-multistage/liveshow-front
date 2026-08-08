/**
 * Live DVR reporting. In live mode video.duration is Infinity (hls.js declares
 * an endless media source and publishes the window through
 * setLiveSeekableRange), so the scrubber's bounds and the "am I live?" answer
 * have to come from video.seekable + hls.liveSyncPosition — not from duration.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';
import type Hls from 'hls.js';
import type { RefObject } from 'react';
import {
  useTransportControls,
  isAtLiveEdge,
  LIVE_EDGE_TOLERANCE_SEC,
} from './use-transport-controls';

describe('isAtLiveEdge', () => {
  it('treats normal drift around the live sync position as live', () => {
    expect(isAtLiveEdge(3600, 3600)).toBe(true);
    expect(isAtLiveEdge(3598, 3600)).toBe(true);
    // Ahead of the sync position (hls.js catching up) is still live.
    expect(isAtLiveEdge(3602, 3600)).toBe(true);
  });

  it('treats a deliberate scrub back as not live', () => {
    expect(isAtLiveEdge(3600 - LIVE_EDGE_TOLERANCE_SEC - 0.1, 3600)).toBe(false);
    expect(isAtLiveEdge(1200, 3600)).toBe(false);
  });
});

// A <video> whose seekable window and currentTime are under test control —
// jsdom gives every element an empty TimeRanges otherwise.
function makeVideo(opts: { currentTime: number; seekable?: [number, number]; duration?: number }) {
  const video = document.createElement('video');
  Object.defineProperty(video, 'currentTime', { value: opts.currentTime, writable: true });
  Object.defineProperty(video, 'duration', { value: opts.duration ?? Infinity, writable: true });
  const range = opts.seekable;
  Object.defineProperty(video, 'seekable', {
    value: {
      length: range ? 1 : 0,
      start: () => range?.[0] ?? 0,
      end: () => range?.[1] ?? 0,
    },
    writable: true,
  });
  return video;
}

function renderControls(
  video: HTMLVideoElement,
  overrides: Partial<Parameters<typeof useTransportControls>[0]> = {},
) {
  const videoRef = { current: video } as RefObject<HTMLVideoElement | null>;
  return renderHook(
    (props: Partial<Parameters<typeof useTransportControls>[0]>) =>
      useTransportControls({ videoRef, mode: 'live', isTimeSource: true, ...props }),
    { initialProps: overrides },
  );
}

const hlsWith = (liveSyncPosition: number | null) =>
  ({ current: { liveSyncPosition } } as unknown as RefObject<Hls | null>);

describe('useTransportControls — live DVR progress', () => {
  it('reports the seekable window and hls.js live sync position', () => {
    const onProgress = vi.fn();
    const video = makeVideo({ currentTime: 1200, seekable: [60, 3606] });
    renderControls(video, { onProgress, hlsRef: hlsWith(3600) });

    fireEvent(video, new Event('timeupdate'));
    expect(onProgress).toHaveBeenCalledWith(1200, 3606, { start: 60, edge: 3600 });
  });

  it('falls back to the seekable end as the live edge with no hls instance (Safari native)', () => {
    const onProgress = vi.fn();
    const video = makeVideo({ currentTime: 3600, seekable: [0, 3606] });
    renderControls(video, { onProgress });

    fireEvent(video, new Event('timeupdate'));
    expect(onProgress).toHaveBeenCalledWith(3600, 3606, { start: 0, edge: 3606 });
  });

  it('reports nothing while nothing is seekable yet', () => {
    const onProgress = vi.fn();
    const video = makeVideo({ currentTime: 0 });
    renderControls(video, { onProgress, hlsRef: hlsWith(10) });

    fireEvent(video, new Event('timeupdate'));
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('applies a live seek command, and a new token re-applies the same time', () => {
    const video = makeVideo({ currentTime: 3600, seekable: [0, 3606] });
    const { rerender } = renderControls(video, { seekCommand: { time: 1200, token: 1 } });
    expect(video.currentTime).toBe(1200);

    video.currentTime = 1500;
    rerender({ seekCommand: { time: 1200, token: 2 } });
    expect(video.currentTime).toBe(1200);
  });
});

describe('useTransportControls — replay progress is unchanged', () => {
  it('reports duration and no live window', () => {
    const onProgress = vi.fn();
    const video = makeVideo({ currentTime: 42, duration: 300, seekable: [0, 300] });
    renderControls(video, { mode: 'replay', onProgress });

    fireEvent(video, new Event('timeupdate'));
    expect(onProgress).toHaveBeenCalledWith(42, 300);
  });
});
