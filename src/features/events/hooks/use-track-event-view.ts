import { useEffect } from 'react';
import { track } from '@/lib/analytics/analytics-client';

// Warm funnel step: the event detail page was opened. One event per mount —
// the old unmount re-emit doubled view_count and nothing read its duration.
export function useTrackEventView(eventId: string | undefined, userId?: string) {
  useEffect(() => {
    if (!eventId) return;
    track({ eventType: 'event.viewed', entityType: 'event', entityId: eventId, userId });
  }, [eventId, userId]);
}
