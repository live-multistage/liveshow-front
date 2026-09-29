import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics/tracking';

// Cold funnel step: the event's card came on screen in a listing (≥50%
// visible). Warm step (event page opened) is useTrackEventView.
//
// Fires at most once per (eventId, list) while this card instance is
// mounted — a ref-based guard, not a session cap — so the funnel counts one
// impression per page view, matching how event_clicked/event_viewed count.
export function useTrackImpression<T extends HTMLElement>(eventId: string, list?: string, position?: number) {
  const ref = useRef<T>(null);
  const tracked = useRef(false);
  const analytics = useAnalytics();

  useEffect(() => {
    // No `list` means this card isn't inside an instrumented listing (e.g.
    // my-list, tickets, wishlist) — nothing to attribute the impression to.
    if (!list) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (tracked.current) return;
      if (!entries.some((e) => e.isIntersecting)) return;
      tracked.current = true;
      analytics.track('event_impression', { eventId, list, position });
      observer.disconnect();
    }, { threshold: 0.5 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [eventId, list, position, analytics]);

  return ref;
}
