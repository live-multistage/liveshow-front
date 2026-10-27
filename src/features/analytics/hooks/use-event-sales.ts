'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import type { SalesGranularity } from '../types/sales.types';

// Totals cover the same window as the sales chart, so they depend on its granularity.
export const eventSalesKey = (granularity: SalesGranularity) =>
  ['sales', 'events', granularity] as const;

export function useGetEventSalesQuery(granularity: SalesGranularity) {
  return useQuery({
    queryKey: eventSalesKey(granularity),
    queryFn: () => analyticsService.getEventSales(granularity),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
