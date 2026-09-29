import { useEffect, useRef } from 'react';
import type { TrackingContext } from '@live-show/api-contracts';
import type { Analytics } from '../core/analytics';
import { effectiveConsent, type ConsentState } from '../core/consent';

const UTM_STORAGE_KEY = 'sho_utm';
const UTM_PARAM_TO_CAMPAIGN_KEY: Record<string, keyof NonNullable<TrackingContext['campaign']>> = {
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'name',
  utm_term: 'term',
  utm_content: 'content',
};

function parseUtm(search: string): TrackingContext['campaign'] | null {
  const params = new URLSearchParams(search);
  let campaign: TrackingContext['campaign'] | undefined;
  for (const [param, key] of Object.entries(UTM_PARAM_TO_CAMPAIGN_KEY)) {
    const value = params.get(param);
    if (!value) continue;
    campaign = { ...campaign, [key]: value };
  }
  return campaign ?? null;
}

function readStoredCampaign(): TrackingContext['campaign'] | null {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeCampaign(campaign: TrackingContext['campaign']): void {
  try {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(campaign));
  } catch {
    // storage blocked — campaign just won't survive a reload this session
  }
}

function clearStoredCampaign(): void {
  try {
    sessionStorage.removeItem(UTM_STORAGE_KEY);
  } catch {
    // storage blocked — nothing was stored
  }
}

/**
 * Emits `page()` on mount and on every pathname/search change; captures utm_* once per session.
 * The captured campaign stays in memory until consent is granted — only then is it persisted
 * (sessionStorage) — and is cleared on denied.
 */
export function useAutoPage(
  analytics: Pick<Analytics, 'page' | 'setCampaign'>,
  pathname: string,
  search: string,
  consent: ConsentState,
): void {
  const capturedCampaign = useRef<TrackingContext['campaign'] | null>(null);

  useEffect(() => {
    const stored = readStoredCampaign();
    if (stored) {
      analytics.setCampaign(stored);
      return;
    }
    const captured = parseUtm(search);
    if (captured) {
      capturedCampaign.current = captured;
      analytics.setCampaign(captured);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- captured once per session, not per navigation
  }, []);

  useEffect(() => {
    const effective = effectiveConsent(consent);
    if (effective === 'denied') {
      clearStoredCampaign();
      return;
    }
    if (effective === 'granted' && capturedCampaign.current) storeCampaign(capturedCampaign.current);
  }, [consent]);

  // StrictMode double-invoke / Suspense re-reveal re-run effects with unchanged deps;
  // the ref survives those, so one page per distinct pathname+search.
  const lastPageKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${pathname}?${search}`;
    if (lastPageKey.current === key) return;
    lastPageKey.current = key;
    analytics.page();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- analytics instance is stable (useRef)
  }, [pathname, search]);
}
