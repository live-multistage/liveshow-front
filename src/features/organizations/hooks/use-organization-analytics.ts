'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import type { SalesGranularity } from '@/features/analytics/types/sales.types';

export const organizationAnalyticsKey = (orgId: string, granularity: SalesGranularity) =>
  ['organizations', orgId, 'analytics', granularity] as const;

export function useOrganizationAnalytics(orgId: string, granularity: SalesGranularity) {
  return useQuery({
    queryKey: organizationAnalyticsKey(orgId, granularity),
    queryFn: () => organizationService.getAnalytics(orgId, granularity),
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
