import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/analytics-client';

export function useTrackEventView(eventId: string | undefined, userId?: string) {
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!eventId) return;

    track({ eventType: 'event.viewed', entityType: 'event', entityId: eventId, userId });

    return () => {
      const duration = Date.now() - startRef.current;
      track({
        eventType: 'event.viewed',
        entityType: 'event',
        entityId: eventId,
        userId,
        properties: { duration_ms: duration },
      });
    };
  }, [eventId, userId]);
}
