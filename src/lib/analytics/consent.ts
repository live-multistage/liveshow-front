'use client';

import { useEffect, useState } from 'react';

// Analytics/profiling consent (LGPD Art. 7–8: non-essential data collection is
// opt-in). Persisted in localStorage so the choice survives sessions and tabs.
// `null` = the visitor hasn't chosen yet → treated as denied until they opt in.
// This gates behavioral analytics only; essential collection (auth, payments,
// the live viewer-count heartbeat that drives transcode start/stop) is unaffected.

// Same name for the localStorage key and its cookie mirror. The cookie only
// lets the server render the consent banner in the first HTML (otherwise it
// paints after hydration and becomes the page LCP); localStorage stays the
// source of truth.
// Read by name in the root layout (a server file cannot import from this
// client module).
const KEY = 'ls_analytics_consent';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
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

function writeConsentCookie(state: ConsentState): void {
  document.cookie = `${KEY}=${state}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function setAnalyticsConsent(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, state);
  writeConsentCookie(state);
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
    // Visitors who decided before the cookie mirror existed: backfill it so the
    // server stops rendering the banner for them on the next request.
    const stored = getAnalyticsConsent();
    if (stored && !document.cookie.includes(`${KEY}=`)) writeConsentCookie(stored);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { consent, setConsent: setAnalyticsConsent };
}
