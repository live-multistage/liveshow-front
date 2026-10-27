'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type { SalesGranularity } from '../types/sales.types';

export const mySalesKey = (granularity: SalesGranularity) =>
  ['sales', 'mine', granularity] as const;

export function useGetMySalesQuery(granularity: SalesGranularity) {
  return useQuery({
    queryKey: mySalesKey(granularity),
    queryFn: () => analyticsService.getMySales(granularity),
    staleTime: 60_000,
    // Switching granularity is a new key; keep the previous one on screen meanwhile.
    placeholderData: keepPreviousData,
  });
}
