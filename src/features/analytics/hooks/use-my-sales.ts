'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type { SalesGranularity } from '../types/sales.types';

export const mySalesKey = (granularity: SalesGranularity) =>
  ['sales', 'mine', granularity] as const;

export function useGetMySalesQuery(granularity: SalesGranularity) {
  return useQuery({
    queryKey: mySalesKey(granularity),
    queryFn: () => analyticsService.getMySales(granularity),
    staleTime: 60_000,
  });
}
