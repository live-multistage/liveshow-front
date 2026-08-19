import { useEffect, useRef } from 'react';
import { getSessionId } from '@/lib/analytics/session-id';
import { track } from '@/lib/analytics/analytics-client';
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
  const joinedRef = useRef<Set<string>>(new Set());
  const startMsRef = useRef(Date.now());

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
        viewerTrackingService.join(eventId, cameraSessionId(baseSessionId, cameraId), cameraId, baseSessionId, userId);
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

    // One event per grid-change moment (not per camera) — consumers derive
    // swap vs. pure addition/removal from added.length/removed.length rather
    // than the frontend pre-classifying the diff. Fires on the initial
    // mount's empty-to-N join too, which is correct: it's the viewer's
    // initial camera selection.
    if (added.length > 0 || removed.length > 0) {
      track({
        eventType: 'stream.camera_switched',
        entityType: 'event',
        entityId: eventId,
        userId: userId ?? undefined,
        properties: { added, removed, gridCameraIds: [...current] },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, activeCameraIds.join(','), userId]);

  // Player-lifetime concerns (analytics, heartbeat loop, final leave) — tied
  // to mount/unmount only, reads the live joinedRef so it always heartbeats
  // whatever's currently active.
  useEffect(() => {
    if (!eventId) return;
    const baseSessionId = getSessionId();
    track({ eventType: 'stream.started', entityType: 'event', entityId: eventId, userId: userId ?? undefined });

    const interval = setInterval(() => {
      for (const cameraId of joinedRef.current) {
        const sessionId = cameraSessionId(baseSessionId, cameraId);
        viewerTrackingService.heartbeat(eventId, sessionId)
          .then((res) => {
            if (res.status === 404) {
              // session expired on server — re-join
              viewerTrackingService.join(eventId, sessionId, cameraId, baseSessionId, userId);
            }
          })
          .catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      for (const cameraId of joinedRef.current) {
        viewerTrackingService.leave(eventId, cameraSessionId(baseSessionId, cameraId));
      }
      joinedRef.current.clear();
      const totalSeconds = Math.floor((Date.now() - startMsRef.current) / 1000);
      track({
        eventType: 'stream.ended',
        entityType: 'event',
        entityId: eventId,
        userId: userId ?? undefined,
        properties: { total_watch_seconds: totalSeconds },
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, userId]);
}
