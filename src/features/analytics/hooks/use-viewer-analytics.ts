'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type { ViewerAnalyticsResult } from '../types/viewer-analytics.types';

export interface ViewerAnalyticsRange {
  from: Date;
  to: Date;
}

export const viewerAnalyticsKey = (
  orgId: string,
  eventId: string,
  range?: ViewerAnalyticsRange,
) =>
  [
    'analytics',
    'viewers',
    orgId,
    eventId,
    range?.from.toISOString() ?? null,
    range?.to.toISOString() ?? null,
  ] as const;

export function useViewerAnalyticsQuery(
  orgId: string | undefined,
  eventId: string | undefined,
  // Undefined means "the whole event", which the backend resolves to the
  // event's own schedule rather than to all of history.
  range?: ViewerAnalyticsRange,
) {
  return useQuery<ViewerAnalyticsResult>({
    queryKey: viewerAnalyticsKey(orgId ?? '', eventId ?? '', range),
    queryFn: () => analyticsService.getViewerAnalytics(orgId!, eventId!, range),
    enabled: !!orgId && !!eventId,
    staleTime: 30_000,
  });
}
