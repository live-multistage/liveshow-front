'use client';

import { useQuery } from '@tanstack/react-query';
import { advertisementsService } from '../services/advertisements.service';

export const adsKey = (orgId: string) => ['ads', orgId] as const;

export function useListAdsQuery(orgId: string | undefined) {
  return useQuery({
    queryKey: adsKey(orgId ?? ''),
    queryFn: () => advertisementsService.list(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
