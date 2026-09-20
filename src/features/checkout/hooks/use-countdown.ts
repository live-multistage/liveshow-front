'use client';

import { useEffect, useState } from 'react';

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function computeState(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  const isExpired = remainingMs <= 0;
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { label: `${pad2(minutes)}:${pad2(seconds)}`, isExpired };
}

/**
 * Recomputes the remaining time from `expiresAt` on every tick instead of
 * decrementing a local counter, so the display never drifts from the real
 * deadline (tab throttling, slow renders, etc).
 */
export function useCountdown(expiresAt: string) {
  const [state, setState] = useState(() => computeState(expiresAt));

  useEffect(() => {
    setState(computeState(expiresAt));
    const id = setInterval(() => setState(computeState(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return state;
}
