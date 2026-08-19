'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';

export type OverviewRange = '7d' | '30d' | '90d';

export const PLATFORM_OVERVIEW_KEY = (range: OverviewRange) =>
  ['platform-admin', 'overview', range] as const;

export function usePlatformOverviewQuery(range: OverviewRange = '30d') {
  return useQuery({
    queryKey: PLATFORM_OVERVIEW_KEY(range),
    queryFn: () => platformAdminService.getOverview(range),
    // Backend caches the heavy rollup ~60s; mirror it client-side.
    staleTime: 60_000,
  });
}
