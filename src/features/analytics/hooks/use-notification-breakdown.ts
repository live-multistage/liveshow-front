'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

export const notificationBreakdownKey = (eventId: string) => ['analytics', 'notifications', eventId] as const;

export function useNotificationBreakdownQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: notificationBreakdownKey(eventId ?? ''),
    queryFn: () => analyticsService.getNotificationBreakdown(eventId!),
    enabled: !!eventId,
    staleTime: 30_000,
  });
}
