'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type { ViewerAnalyticsResult } from '../types/viewer-analytics.types';

export const viewerAnalyticsKey = (orgId: string, eventId: string) =>
  ['analytics', 'viewers', orgId, eventId] as const;

export function useViewerAnalyticsQuery(
  orgId: string | undefined,
  eventId: string | undefined,
) {
  return useQuery<ViewerAnalyticsResult>({
    queryKey: viewerAnalyticsKey(orgId ?? '', eventId ?? ''),
    queryFn: () => analyticsService.getViewerAnalytics(orgId!, eventId!),
    enabled: !!orgId && !!eventId,
    staleTime: 30_000,
  });
}
