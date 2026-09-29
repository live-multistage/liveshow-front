import { useEffect, useRef } from 'react';
import { getSessionId } from '@/lib/analytics/session-id';
import { useAnalytics } from '@/lib/analytics/tracking';
import { viewerTrackingService } from '../services/viewer-tracking.service';

const HEARTBEAT_INTERVAL_MS = 20_000;

// One join session per currently-visible camera — Main+Rail/Grid can show
// several at once, and the backend drives transcode start/stop per camera
// (see live-show-orchestrator's per-camera viewer-tracking), so each
// visible camera needs its own tracked session.
function cameraSessionId(baseSessionId: string, cameraId: string): string {
  return `${baseSessionId}:${cameraId}`;
}

export function useViewerTracking(
  eventId: string | undefined,
  activeCameraIds: string[],
  userId?: string | null,
): void {
  const analytics = useAnalytics();
  const joinedRef = useRef<Set<string>>(new Set());

  // Diffs the visible-camera set against what's already joined, on mount
  // and whenever activeCameraIds changes.
  useEffect(() => {
    if (!eventId) return;
    const baseSessionId = getSessionId();
    const current = new Set(activeCameraIds);
    const joined = joinedRef.current;

    const added: string[] = [];
    const removed: string[] = [];

    for (const cameraId of current) {
      if (!joined.has(cameraId)) {
        viewerTrackingService.join(eventId, cameraSessionId(baseSessionId, cameraId), cameraId, baseSessionId);
        joined.add(cameraId);
        added.push(cameraId);
      }
    }
    for (const cameraId of [...joined]) {
      if (!current.has(cameraId)) {
        viewerTrackingService.leave(eventId, cameraSessionId(baseSessionId, cameraId));
        joined.delete(cameraId);
        removed.push(cameraId);
      }
    }

    // camera_switched is a single from/to swap — only a clean 1-for-1
    // exchange maps to that shape. Composition changes (adding/removing a
    // camera in a multi-view grid, the initial empty-to-N mount join) aren't
    // "switches" in that sense, so they're left untracked rather than
    // guessed at.
    if (added.length === 1 && removed.length === 1) {
      analytics.track('camera_switched', { eventId, from: removed[0], to: added[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, activeCameraIds.join(','), userId]);

  // Player-lifetime concerns (heartbeat loop, final leave) — tied to
  // mount/unmount only, reads the live joinedRef so it always heartbeats
  // whatever's currently active. player_opened/playback_ended (the old
  // stream.started/stream.ended) now live in Player.tsx, which owns the
  // whole player's mount span for both live and replay — tracking them here
  // too would double-fire for every live session.
  useEffect(() => {
    if (!eventId) return;
    const baseSessionId = getSessionId();

    const interval = setInterval(() => {
      for (const cameraId of joinedRef.current) {
        const sessionId = cameraSessionId(baseSessionId, cameraId);
        viewerTrackingService.heartbeat(eventId, sessionId).then((status) => {
          // session expired on server — re-join
          if (status === 404) {
            viewerTrackingService.join(eventId, sessionId, cameraId, baseSessionId);
          }
        });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      for (const cameraId of joinedRef.current) {
        viewerTrackingService.leave(eventId, cameraSessionId(baseSessionId, cameraId));
      }
      joinedRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, userId]);
}
