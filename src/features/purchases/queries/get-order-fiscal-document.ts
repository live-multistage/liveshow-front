'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import { normalizeError } from '@/lib/http/errors';
import type { OrderFiscalDocumentView } from '@live-show/api-contracts';

export const orderFiscalDocumentKey = (orderId: string) => ['purchases', 'fiscal', orderId] as const;

async function getOrderFiscalDocument(orderId: string): Promise<OrderFiscalDocumentView | null> {
  try {
    const { data } = await httpClient.get<OrderFiscalDocumentView>(`/orders/${orderId}/fiscal-document`);
    return data;
  } catch (err) {
    // 404 = no document for this order (flag was off, or free order): a state, not an error.
    if (normalizeError(err).status === 404) return null;
    throw err;
  }
}

export function useOrderFiscalDocumentQuery(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: orderFiscalDocumentKey(orderId),
    queryFn: () => getOrderFiscalDocument(orderId),
    enabled,
    staleTime: 60_000,
  });
}
