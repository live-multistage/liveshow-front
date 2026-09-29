import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics/tracking';

// Fires once per rail, per page view, when at least half of it scrolls
// into view — mirrors useTrackImpression's ref-based once-per-mount guard.
export function useTrackRailViewed<T extends HTMLElement>(rail: string, position: number, itemCount: number) {
  const ref = useRef<T>(null);
  const tracked = useRef(false);
  const analytics = useAnalytics();

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      if (tracked.current) return;
      if (!entries.some((e) => e.isIntersecting)) return;
      tracked.current = true;
      analytics.track('home_rail_viewed', { rail, position, itemCount });
      observer.disconnect();
    }, { threshold: 0.5 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [rail, position, itemCount, analytics]);

  return ref;
}
