'use client';

import { useQuery } from '@tanstack/react-query';
import { ticketingService } from '../services/ticketing.service';

export const orderKeys = {
  mine: ['orders', 'mine'] as const,
};

export function useMyOrdersQuery() {
  return useQuery({
    queryKey: orderKeys.mine,
    queryFn: () => ticketingService.getMyOrders(),
  });
}
