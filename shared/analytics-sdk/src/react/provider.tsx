import { createContext, createElement, useContext, useEffect, useRef, type ReactNode } from 'react';
import { createAnalytics, type Analytics, type AnalyticsOptions } from '../core/analytics';
import type { ConsentState } from '../core/consent';
import { installClickDelegate } from './click-delegate';
import { useAutoPage } from './auto-page';

const AnalyticsContext = createContext<Analytics | null>(null);

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

  useAutoPage(analytics, p.pathname, p.search);

  return createElement(AnalyticsContext.Provider, { value: analytics }, p.children);
}

export function useAnalytics(): Analytics {
  const analytics = useContext(AnalyticsContext);
  if (!analytics) throw new Error('useAnalytics must be used within an AnalyticsProvider');
  return analytics;
}

/** Bridges auth state to identity: null→id identifies (+ groups per org), id→null resets. */
export function useAnalyticsIdentity(user: { id: string; organizationIds?: string[] } | null): void {
  const analytics = useAnalytics();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId === previousUserId.current) return;
    previousUserId.current = userId;

    if (!userId) {
      analytics.reset();
      return;
    }
    analytics.identify(userId);
    for (const organizationId of user?.organizationIds ?? []) {
      analytics.group(organizationId);
    }
  }, [analytics, user]);
}
