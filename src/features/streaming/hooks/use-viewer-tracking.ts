import { useEffect } from 'react';
import { getSessionId } from '@/lib/analytics/session-id';
import { track } from '@/lib/analytics/analytics-client';
import { viewerTrackingService } from '../services/viewer-tracking.service';

export function useViewerTracking(
  eventId: string | undefined,
  userId?: string | null,
): void {
  useEffect(() => {
    if (!eventId) return;

    const sessionId = getSessionId();
    const startMs = Date.now();

    viewerTrackingService.join(eventId, sessionId, userId);
    track({ eventType: 'stream.started', entityType: 'event', entityId: eventId, userId: userId ?? undefined });

    const interval = setInterval(() => {
      viewerTrackingService.heartbeat(eventId, sessionId)
        .then((res) => {
          if (res.status === 404) {
            // session expired on server — re-join
            viewerTrackingService.join(eventId, sessionId, userId);
          }
        })
        .catch(() => {});
    }, 20_000);

    return () => {
      clearInterval(interval);
      viewerTrackingService.leave(eventId, sessionId);
      const totalSeconds = Math.floor((Date.now() - startMs) / 1000);
      track({
        eventType: 'stream.ended',
        entityType: 'event',
        entityId: eventId,
        userId: userId ?? undefined,
        properties: { total_watch_seconds: totalSeconds },
      });
    };
  }, [eventId, userId]);
}
