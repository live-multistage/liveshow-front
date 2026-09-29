'use client';

import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/lib/analytics/tracking';

// Fires `player_opened` once on mount. Used by the access-gate screens (no
// ticket / not logged in) where the player itself never mounts, so
// Player.tsx's own player_opened (hasAccess: true) never fires for them.
export function usePlayerOpened(eventId: string, mode: 'live' | 'replay', hasAccess: boolean): void {
  const analytics = useAnalytics();
  // React StrictMode (dev) double-invokes mount effects; the lab runs `pnpm
  // dev`, so an unguarded track() here would double-count every gated view.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    analytics.track('player_opened', { eventId, mode, hasAccess });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, mode, hasAccess]);
}
