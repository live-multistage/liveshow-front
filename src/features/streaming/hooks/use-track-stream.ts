import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/analytics-client';

export function useTrackStream(eventId: string | undefined, userId?: string) {
  const startRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!eventId) return;

    track({ eventType: 'stream.started', entityType: 'event', entityId: eventId, userId });

    intervalRef.current = setInterval(() => {
      track({
        eventType: 'stream.heartbeat',
        entityType: 'event',
        entityId: eventId,
        userId,
        properties: { elapsed_seconds: Math.floor((Date.now() - startRef.current) / 1000) },
      });
    }, 60_000);

    return () => {
      clearInterval(intervalRef.current);
      const totalSeconds = Math.floor((Date.now() - startRef.current) / 1000);
      track({
        eventType: 'stream.ended',
        entityType: 'event',
        entityId: eventId,
        userId,
        properties: { total_watch_seconds: totalSeconds },
      });
    };
  }, [eventId, userId]);
}
