'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';
import type Hls from 'hls.js';

// A playback position within this of the live edge still counts as "live".
// hls.js parks playback at `liveSyncPosition` (edge − liveSyncDurationCount ×
// target duration) and lets it drift by up to a segment either way while it
// catches up at maxLiveSyncPlaybackRate, so exact equality never happens. Three
// seconds sits above that natural jitter (one 2s segment) and well below any
// deliberate DVR scrub-back, so the badge neither flickers during normal
// playback nor claims "live" once the viewer has actually rewound.
export const LIVE_EDGE_TOLERANCE_SEC = 3;

// Safari's native HLS player has no liveSyncPosition to report, so the edge
// falls back to seekable.end — but native playback deliberately parks about
// three target durations behind the playlist end (HLS spec recommendation),
// i.e. routinely 6–18s. Judged by the hls.js tolerance every Safari viewer
// would read as "behind live" from the first frame. targetDuration isn't
// reachable without an hls instance, so the native branch gets a tolerance
// wide enough to cover that parking distance instead.
export const NATIVE_LIVE_EDGE_TOLERANCE_SEC = 20;

export function isAtLiveEdge(
  position: number,
  edge: number,
  tolerance: number = LIVE_EDGE_TOLERANCE_SEC,
): boolean {
  return edge - position <= tolerance;
}

// Where the primary live panel currently sits inside its DVR window.
export interface LiveWindow {
  // Start of the seekable (sliding) window.
  start: number;
  // hls.js's live sync target — the position "live" actually means, which is
  // a few segments BEHIND seekable.end, not the end itself.
  edge: number;
  // How close to `edge` still counts as live — depends on which player
  // produced `edge` (see NATIVE_LIVE_EDGE_TOLERANCE_SEC).
  tolerance: number;
}

// A commanded seek. The token is what re-applies it (see below); `cameraId` is
// the camera whose timeline `time` was read from — live media timelines are
// unrelated between cameras, so applying one camera's offset to another is
// always wrong. Absent in replay, where every camera is its own VOD timeline
// starting at 0 and the same offset is right for all of them.
export interface LiveSeekCommand {
  time: number;
  token: number;
  cameraId?: string | null;
}

export interface UseTransportControlsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  // Live instance, needed for liveSyncPosition. Null on Safari's native-HLS
  // path, where the seekable end is used as the live edge instead.
  hlsRef?: RefObject<Hls | null>;
  mode: 'live' | 'replay';
  // Replay's shared paused state — every active camera's <video> gets the same
  // value so switching the main camera mid-playback doesn't leave a background
  // tile still running. Live never pauses.
  paused?: boolean;
  // A new object (even with the same `time`) re-applies the seek — the token
  // is what triggers the effect, not the time value alone, so re-seeking to a
  // position already reached still works. Used by replay's scrubber and by
  // live's DVR scrubber / return-to-live. `cameraId` (live only) records which
  // camera's media timeline the offset came from — CameraGrid uses it to keep
  // the command off any other panel.
  seekCommand?: LiveSeekCommand | null;
  // True for exactly one active camera's panel (the current main/focused one)
  // — only that panel's native playback events drive the transport bar's clock
  // and end-of-video handling.
  isTimeSource?: boolean;
  // `duration` is the VOD length in replay and the seekable END in live (where
  // video.duration is Infinity and therefore useless). `live` is present only
  // in live mode.
  onProgress?: (currentTime: number, duration: number, live?: LiveWindow) => void;
  onEnded?: () => void;
}

// Transport wiring for one panel: pause/resume, commanded seeks and the
// time-source progress/ended reporting. Replay drives play/pause/seek from
// ReplayTransportBar; live drives DVR seeks and the live-edge readout from
// TransportBar. Behavior characterized by VideoPanel.characterization.test.tsx.
export function useTransportControls({
  videoRef,
  hlsRef,
  mode,
  paused,
  seekCommand,
  isTimeSource = false,
  onProgress,
  onEnded,
}: UseTransportControlsOptions): void {
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
    const report = () => {
      if (mode !== 'live') {
        onProgress(video.currentTime, video.duration || 0);
        return;
      }
      // Live: video.duration is Infinity (hls.js declares the media source
      // endless and publishes the DVR window through setLiveSeekableRange), so
      // the scrubber's bounds come from `seekable`, not from duration.
      const seekable = video.seekable;
      if (!seekable.length) return;
      const end = seekable.end(seekable.length - 1);
      const sync = hlsRef?.current?.liveSyncPosition;
      const hasSync = typeof sync === 'number' && Number.isFinite(sync);
      onProgress(video.currentTime, end, {
        start: seekable.start(0),
        edge: hasSync ? sync : end,
        tolerance: hasSync ? LIVE_EDGE_TOLERANCE_SEC : NATIVE_LIVE_EDGE_TOLERANCE_SEC,
      });
    };
    video.addEventListener('timeupdate', report);
    video.addEventListener('durationchange', report);
    return () => {
      video.removeEventListener('timeupdate', report);
      video.removeEventListener('durationchange', report);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeSource, onProgress, mode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isTimeSource || !onEnded) return;
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeSource, onEnded]);
}
