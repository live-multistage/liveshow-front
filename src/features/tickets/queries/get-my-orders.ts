'use client';

import { useQuery } from '@tanstack/react-query';
import { ticketingService } from '../services/ticketing.service';

export const orderKeys = {
  mine: ['orders', 'mine'] as const,
};

export function useMyOrdersQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orderKeys.mine,
    queryFn: () => ticketingService.getMyOrders(),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * attempt, 8000),
  });
}
