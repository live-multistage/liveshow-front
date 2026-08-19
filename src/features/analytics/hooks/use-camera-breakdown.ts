'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

export const cameraBreakdownKey = (orgId: string, eventId: string) =>
  ['analytics', 'cameras', orgId, eventId] as const;

export function useCameraBreakdownQuery(orgId: string | undefined, eventId: string | undefined) {
  return useQuery({
    queryKey: cameraBreakdownKey(orgId ?? '', eventId ?? ''),
    queryFn: () => analyticsService.getCameraBreakdown(orgId!, eventId!),
    enabled: !!orgId && !!eventId,
    staleTime: 30_000,
  });
}
