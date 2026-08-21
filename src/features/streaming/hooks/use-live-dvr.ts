'use client';

import { useCallback, useState } from 'react';
import { isAtLiveEdge } from './use-transport-controls';
import type { LiveSeekCommand, LiveWindow } from './use-transport-controls';
import type { DvrState } from '../components/TransportBar';

// Live DVR state: where the primary panel sits inside the manifest's seekable
// window, the viewer's INTENT to sit behind the live edge, and the seek
// commands addressed to the primary camera.
//
// dvrSeeking is set only by an actual scrub-back — deliberately NOT derived
// from `atLive`: that is a MEASURED distance, and an ordinary rebuffer of more
// than the tolerance also puts the position behind the edge. Feeding that into
// hls.js's liveMaxLatencyDurationCount (which DVR lifts to Infinity) would
// permanently disable its catch-up for any viewer who ever stalls.
export function useLiveDvr(effectiveMainCameraId: string | null) {
  const [dvr, setDvr] = useState<DvrState | null>(null);
  const [dvrSeeking, setDvrSeeking] = useState(false);
  const [seekCommand, setSeekCommand] = useState<LiveSeekCommand | null>(null);

  // Stable identity: this lands on the primary VideoPanel's timeupdate
  // listener, which would otherwise be torn down and re-added on every tick.
  const handleProgress = useCallback((position: number, end: number, live?: LiveWindow) => {
    if (!live) return;
    setDvr({ position, end, start: live.start, edge: live.edge, tolerance: live.tolerance });
  }, []);

  const atLive = !dvr || isAtLiveEdge(dvr.position, dvr.edge, dvr.tolerance);

  // Declared here (not memoized) because it needs the camera the seek is
  // addressed to. onSeek fires on a scrubber drag / badge click, never on a
  // playback tick, so a fresh identity per render costs nothing.
  const handleSeek = (time: number) => {
    // Optimistic, so the scrubber tracks the drag instead of snapping back
    // between timeupdates (same pattern as ReplayPlayer).
    setDvr((d) => (d ? { ...d, position: time } : d));
    // Intent: seeking meaningfully behind the edge starts a DVR rewind;
    // seeking TO the edge (the badge's "back to live") ends it.
    setDvrSeeking(!!dvr && !isAtLiveEdge(time, dvr.edge, dvr.tolerance));
    setSeekCommand({ time, token: Date.now(), cameraId: effectiveMainCameraId });
  };

  // Promoting another camera ends the rewind: the seek was addressed to the
  // old primary, and the promoted panel is at the same wall-clock instant
  // anyway from following the previous primary's PROGRAM-DATE-TIME.
  const endRewind = useCallback(() => {
    setSeekCommand(null);
    setDvrSeeking(false);
  }, []);

  // A seek/DVR position belongs to the stage it was taken in: the new stage's
  // cameras are different manifests with unrelated media timelines, so a
  // surviving command would be replayed onto a fresh panel as a meaningless
  // offset.
  const resetForStageChange = useCallback(() => {
    setSeekCommand(null);
    setDvr(null);
    setDvrSeeking(false);
  }, []);

  // The rewind INTENT alone no longer applies (e.g. the camera it was tied to
  // left the composition) but position/command state is still valid.
  const clearRewindIntent = useCallback(() => setDvrSeeking(false), []);

  return {
    dvr,
    dvrSeeking,
    seekCommand,
    atLive,
    handleProgress,
    handleSeek,
    endRewind,
    resetForStageChange,
    clearRewindIntent,
  };
}
