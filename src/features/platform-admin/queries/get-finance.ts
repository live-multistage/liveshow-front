'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import type { OverviewRange } from './get-platform-overview';

export function usePlatformRevenueQuery(range: OverviewRange = '30d') {
  return useQuery({
    queryKey: ['platform-admin', 'revenue', range] as const,
    queryFn: () => platformAdminService.getRevenue(range),
    staleTime: 60_000,
  });
}

export function useOrgBalancesQuery() {
  return useQuery({
    queryKey: ['platform-admin', 'org-balances'] as const,
    queryFn: platformAdminService.getOrgBalances,
    staleTime: 30_000,
  });
}
