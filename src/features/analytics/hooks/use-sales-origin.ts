'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type { SalesOriginResult } from '../types/sales-origin.types';

export const salesOriginKey = (orgId: string, eventId: string) =>
  ['analytics', 'sales-origin', orgId, eventId] as const;

export function useSalesOriginQuery(
  orgId: string | undefined,
  eventId: string | undefined,
) {
  return useQuery<SalesOriginResult>({
    queryKey: salesOriginKey(orgId ?? '', eventId ?? ''),
    queryFn: () => analyticsService.getSalesOrigin(orgId!, eventId!),
    enabled: !!orgId && !!eventId,
    staleTime: 30_000,
  });
}
