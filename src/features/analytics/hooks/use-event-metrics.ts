'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

export interface MetricsRange {
  from: Date;
  to: Date;
}

export const eventMetricsKey = (eventId: string, range?: MetricsRange) =>
  ['analytics', 'metrics', eventId, range?.from.toISOString() ?? null, range?.to.toISOString() ?? null] as const;

export function useGetEventMetricsQuery(eventId: string | undefined, range?: MetricsRange) {
  return useQuery({
    queryKey: eventMetricsKey(eventId ?? '', range),
    queryFn: () => analyticsService.getEventMetrics(eventId!, range),
    enabled: !!eventId,
    staleTime: 30_000,
  });
}
