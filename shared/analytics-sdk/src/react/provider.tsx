import { createContext, createElement, useContext, useEffect, useRef, type ReactNode } from 'react';
import { createAnalytics, createInertAnalytics, type Analytics, type AnalyticsOptions } from '../core/analytics';
import type { ConsentState } from '../core/consent';
import { installClickDelegate } from './click-delegate';
import { useAutoPage } from './auto-page';

const AnalyticsContext = createContext<Analytics | null>(null);

// ponytail: module-level singleton so every no-provider caller (missing write key,
// impersonation, Suspense fallback) shares one stable inert object instead of a no-op throw.
const inertAnalytics = createInertAnalytics();

export function AnalyticsProvider(p: {
  options: Omit<AnalyticsOptions, 'consent'>;
  consent: ConsentState;
  pathname: string;
  search: string;
  children: ReactNode;
}): JSX.Element {
  const analyticsRef = useRef<Analytics | null>(null);
  if (!analyticsRef.current) {
    analyticsRef.current = createAnalytics({ ...p.options, consent: p.consent });
  }
  const analytics = analyticsRef.current;

  const consentRef = useRef(p.consent);
  useEffect(() => {
    if (consentRef.current === p.consent) return;
    consentRef.current = p.consent;
    analytics.setConsent(p.consent);
  }, [analytics, p.consent]);

  useEffect(() => installClickDelegate(document, analytics), [analytics]);

  useAutoPage(analytics, p.pathname, p.search, p.consent);

  return createElement(AnalyticsContext.Provider, { value: analytics }, p.children);
}

export function useAnalytics(): Analytics {
  const analytics = useContext(AnalyticsContext);
  return analytics ?? inertAnalytics;
}

/**
 * Bridges auth state to identity: null→id identifies (+ groups per org), id→null resets,
 * A→B (a different user, e.g. account switch) resets before identifying B so A's
 * anonymousId/session never get stitched to B.
 */
export function useAnalyticsIdentity(user: { id: string; organizationIds?: string[] } | null): void {
  const analytics = useAnalytics();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;
    const previous = previousUserId.current;
    if (userId === previous) return;
    previousUserId.current = userId;

    if (!userId || previous) analytics.reset();
    if (!userId) return;
    analytics.identify(userId);
    for (const organizationId of user?.organizationIds ?? []) {
      analytics.group(organizationId);
    }
  }, [analytics, user]);
}
