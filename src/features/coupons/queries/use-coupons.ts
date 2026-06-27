'use client';

import { useQuery } from '@tanstack/react-query';
import { couponsService } from '../services/coupons.service';

export const couponsKey = (orgId?: string) => ['coupons', orgId ?? 'all'] as const;

export function useListCouponsQuery(orgId?: string) {
  return useQuery({
    queryKey: couponsKey(orgId),
    queryFn: () => couponsService.list(orgId ? { orgId } : {}),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
