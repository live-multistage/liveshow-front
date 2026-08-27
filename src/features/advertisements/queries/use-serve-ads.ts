'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { ServedAd, AdPlacement } from '../types/advertisement.types';

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
    staleTime: 5 * 60_000,
    retry: false,
  });
}
