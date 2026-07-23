'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

export interface UseReplayControlsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  mode: 'live' | 'replay';
  // Shared paused state — every active camera's <video> gets the same value so
  // switching the main camera mid-playback doesn't leave a background tile
  // still running.
  paused?: boolean;
  // A new object (even with the same `time`) re-applies the seek — the token
  // is what triggers the effect, not the time value alone, so re-seeking to a
  // position already reached still works.
  seekCommand?: { time: number; token: number } | null;
  // True for exactly one active camera's panel (the current main/focused one)
  // — only that panel's native playback events drive ReplayTransportBar's
  // clock and end-of-video handling.
  isTimeSource?: boolean;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

// Replay's transport wiring for one panel: pause/resume, commanded seeks and
// the time-source progress/ended reporting. Extracted from VideoPanel (Etapa 2
// of docs/review/video-panel-review.md) — behavior characterized by
// VideoPanel.characterization.test.tsx.
export function useReplayControls({
  videoRef,
  mode,
  paused,
  seekCommand,
  isTimeSource = false,
  onProgress,
  onEnded,
}: UseReplayControlsOptions): void {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== 'replay' || paused === undefined) return;
    if (paused) video.pause();
    else void video.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, mode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !seekCommand) return;
    video.currentTime = seekCommand.time;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekCommand?.token]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isTimeSource || !onProgress) return;
    const report = () => onProgress(video.currentTime, video.duration || 0);
    video.addEventListener('timeupdate', report);
    video.addEventListener('durationchange', report);
    return () => {
      video.removeEventListener('timeupdate', report);
      video.removeEventListener('durationchange', report);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeSource, onProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isTimeSource || !onEnded) return;
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeSource, onEnded]);
}
