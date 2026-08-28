'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { OrderView } from '@live-show/api-contracts';

export const orderHistoryKey = ['purchases', 'history'] as const;

async function getOrderHistory(): Promise<OrderView[]> {
  const { data } = await httpClient.get<OrderView[]>('/orders/history');
  return data;
}

export function useOrderHistoryQuery() {
  return useQuery({ queryKey: orderHistoryKey, queryFn: getOrderHistory, staleTime: 30_000 });
}
