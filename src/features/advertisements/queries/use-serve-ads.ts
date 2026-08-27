'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { ServedAd, AdPlacement } from '../types/advertisement.types';

/**
 * Cache policy for every /ads/serve query.
 *
 * A served record is billable at most once — the impression beacon consumes it
 * server-side — so replaying a cached servedId on a later mount records
 * nothing and the ad is shown for free. Each mount must therefore serve a
 * fresh record: no stale reuse, no cache kept past unmount. Refetch on focus /
 * reconnect stays off so an already-shown ad is never swapped mid-view for a
 * record whose beacon we would then never fire.
 */
export const SERVE_QUERY_CACHE = {
  staleTime: 0,
  gcTime: 0,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

async function fetchServedAds(placement: AdPlacement, limit: number, eventId?: string): Promise<ServedAd[]> {
  const { data } = await httpClient.get<ServedAd[]>('/ads/serve', {
    params: { placement, limit, ...(eventId ? { eventId } : {}) },
  });
  return data;
}

export function useServeAdsQuery(placement: AdPlacement, limit = 1, eventId?: string) {
  return useQuery({
    queryKey: ['ads', 'serve', placement, limit, eventId ?? null],
    queryFn: () => fetchServedAds(placement, limit, eventId),
    ...SERVE_QUERY_CACHE,
    retry: false,
  });
}
