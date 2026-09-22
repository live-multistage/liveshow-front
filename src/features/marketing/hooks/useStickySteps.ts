'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Shared by organizers/HowItWorks and advertisers/HowItWorks — both render a
 * sticky "N steps, one visual panel each" section and fall back to a stacked
 * list below this breakpoint.
 */
export function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 1024px)');
    setIsCompact(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setIsCompact(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isCompact;
}

/** Tracks which step's DOM node sits closest to the viewport center while scrolling. */
export function useActiveStep(stepCount: number): [number, (index: number, el: HTMLDivElement | null) => void] {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    let ticking = false;

    const computeActive = () => {
      ticking = false;
      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;

      for (let i = 0; i < stepCount; i += 1) {
        const el = refs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }

      if (closestIndex !== activeRef.current) setActive(closestIndex);
    };

    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(computeActive);
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepCount]);

  const setRef = (index: number, el: HTMLDivElement | null) => {
    refs.current[index] = el;
  };

  return [active, setRef];
}
