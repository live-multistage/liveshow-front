import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics/tracking';

// Fires once per rail, per page view, when at least half of it scrolls
// into view — mirrors useTrackImpression's ref-based once-per-mount guard
// and its background-tab deferral (see there for why).
export function useTrackRailViewed<T extends HTMLElement>(rail: string, position: number, itemCount: number) {
  const ref = useRef<T>(null);
  const tracked = useRef(false);
  const analytics = useAnalytics();

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    let pending = false;

    const emit = () => {
      if (tracked.current) return;
      tracked.current = true;
      analytics.track('home_rail_viewed', { rail, position, itemCount });
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };

    const onVisibilityChange = () => {
      if (pending && document.visibilityState === 'visible') emit();
    };

    const observer = new IntersectionObserver((entries) => {
      if (tracked.current) return;
      if (!entries.some((e) => e.isIntersecting)) return;
      if (document.visibilityState === 'hidden') {
        pending = true;
        return;
      }
      emit();
    }, { threshold: 0.5 });

    observer.observe(el);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [rail, position, itemCount, analytics]);

  return ref;
}
