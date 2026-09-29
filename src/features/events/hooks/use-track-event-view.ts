import { useEffect } from 'react';
import { useAnalytics } from '@/lib/analytics/tracking';

interface EventViewParams {
  eventId: string | undefined;
  status: 'upcoming' | 'live' | 'replay' | 'ended';
  priceCents?: number;
  isFree?: boolean;
  organizationId?: string;
}

// Warm funnel step: the event detail page was opened. One event per mount —
// the old unmount re-emit doubled view_count and nothing read its duration.
export function useTrackEventView({ eventId, status, priceCents, isFree, organizationId }: EventViewParams): void {
  const analytics = useAnalytics();

  useEffect(() => {
    if (!eventId) return;
    analytics.track('event_viewed', { eventId, status, priceCents, isFree, organizationId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one event per mount, not per prop change
  }, [eventId]);
}
