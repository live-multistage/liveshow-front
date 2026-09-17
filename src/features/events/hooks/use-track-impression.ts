import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/analytics-client';

// Cold funnel step: the event's card came on screen in a listing (≥50%
// visible). Warm step (event page opened) is useTrackEventView.
//
// Counted on EVERY appearance, not once per browser session. The two steps have
// to be comparable for the funnel to mean anything, and page views were already
// uncapped — every visit counted — while impressions were capped at one per
// session per event. That is why the funnel reported "142,9%": ten views
// against seven impressions is not a funnel, it is two different measurements
// side by side.
//
// The observer is deliberately left connected, so scrolling a card away and
// back counts again — which is what "impression" means everywhere else.
export function useTrackImpression<T extends HTMLElement>(eventId: string, userId?: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      track({ eventType: 'event.impression', entityType: 'event', entityId: eventId, userId });
    }, { threshold: 0.5 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [eventId, userId]);

  return ref;
}
