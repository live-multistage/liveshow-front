'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useNavigationLoadingStore } from '@/shared/stores/navigation-loading.store';

function NavigationEventsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const stop = useNavigationLoadingStore((s) => s.stop);
  const start = useNavigationLoadingStore((s) => s.start);
  const mountedRef = useRef(false);

  // Stop loading when route change completes
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    stop();
  }, [pathname, searchParams, stop]);

  // Intercept anchor clicks to start loading
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as Element).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Only internal navigation, skip hash-only, external, and new-tab links
      const isInternal = href.startsWith('/') && !href.startsWith('//');
      const isHashOnly = href.startsWith('#');
      const opensNewTab = target.target === '_blank';
      const isModifiedClick = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

      if (isInternal && !isHashOnly && !opensNewTab && !isModifiedClick) {
        start();
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [start]);

  return null;
}

// Needs Suspense because useSearchParams suspends on SSR
import { Suspense } from 'react';

export function NavigationEvents() {
  return (
    <Suspense fallback={null}>
      <NavigationEventsInner />
    </Suspense>
  );
}
