'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { OrderHistoryItem } from '../types/order-history.types';

export const orderHistoryKey = ['purchases', 'history'] as const;

async function getOrderHistory(): Promise<OrderHistoryItem[]> {
  const { data } = await httpClient.get<OrderHistoryItem[]>('/orders/history');
  return data;
}

export function useOrderHistoryQuery() {
  return useQuery({ queryKey: orderHistoryKey, queryFn: getOrderHistory, staleTime: 30_000 });
}
