import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics/analytics-client';

const SEEN_KEY = 'ls_impressions';

function alreadySeen(eventId: string): boolean {
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]');
    if (seen.includes(eventId)) return true;
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, eventId]));
    return false;
  } catch {
    return false;
  }
}

// Cold funnel step: the event's card was actually on screen in a listing
// (≥50% visible), once per browser session per event. Warm step
// (event page opened) is useTrackEventView.
export function useTrackImpression<T extends HTMLElement>(eventId: string, userId?: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      if (alreadySeen(eventId)) return;
      track({ eventType: 'event.impression', entityType: 'event', entityId: eventId, userId });
    }, { threshold: 0.5 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [eventId, userId]);

  return ref;
}
