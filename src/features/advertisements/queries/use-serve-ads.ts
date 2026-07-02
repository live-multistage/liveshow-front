'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { ServedAd, AdPlacement } from '../types/advertisement.types';

async function fetchServedAds(placement: AdPlacement, limit: number): Promise<ServedAd[]> {
  const { data } = await httpClient.get<ServedAd[]>('/ads/serve', {
    params: { placement, limit },
  });
  return data;
}

export function useServeAdsQuery(placement: AdPlacement, limit = 1) {
  return useQuery({
    queryKey: ['ads', 'serve', placement, limit],
    queryFn: () => fetchServedAds(placement, limit),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
