'use client';

import { useEffect, useState } from 'react';

// Analytics/profiling consent (LGPD Art. 7–8: non-essential data collection is
// opt-in). Persisted in localStorage so the choice survives sessions and tabs.
// `null` = the visitor hasn't chosen yet → treated as denied until they opt in.
// This gates behavioral analytics only; essential collection (auth, payments,
// the live viewer-count heartbeat that drives transcode start/stop) is unaffected.

const KEY = 'ls_analytics_consent';
const CHANGE_EVENT = 'ls-consent-change';

export type ConsentState = 'granted' | 'denied';

export function getAnalyticsConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(KEY);
  return v === 'granted' || v === 'denied' ? v : null;
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === 'granted';
}

export function setAnalyticsConsent(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, state);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// React binding. Starts undefined ("not read yet") on both server and first
// client render to avoid a hydration mismatch, then syncs from storage in the
// effect. `undefined` must not be treated as "no choice" — rendering the
// consent banner on it flashes the banner at every reload for visitors who
// already decided. `storage` covers cross-tab changes; the custom event covers
// same-tab.
export function useAnalyticsConsent(): {
  consent: ConsentState | null | undefined;
  setConsent: (s: ConsentState) => void;
} {
  const [consent, setState] = useState<ConsentState | null | undefined>(undefined);

  useEffect(() => {
    const sync = () => setState(getAnalyticsConsent());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { consent, setConsent: setAnalyticsConsent };
}
