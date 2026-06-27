'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

export const eventMetricsKey = (eventId: string) => ['analytics', 'metrics', eventId] as const;

export function useGetEventMetricsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: eventMetricsKey(eventId ?? ''),
    queryFn: () => analyticsService.getEventMetrics(eventId!),
    enabled: !!eventId,
    staleTime: 30_000,
  });
}
