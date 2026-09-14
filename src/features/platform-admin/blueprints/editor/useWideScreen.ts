'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 1280px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** The visual editor needs ≥1280px (brief §3). The server render assumes a wide screen. */
export function useWideScreen(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true);
}
