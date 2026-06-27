'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

export const eventSalesKey = () => ['sales', 'events'] as const;

export function useGetEventSalesQuery() {
  return useQuery({
    queryKey: eventSalesKey(),
    queryFn: () => analyticsService.getEventSales(),
    staleTime: 60_000,
  });
}
