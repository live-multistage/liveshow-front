'use client';

import { useQuery } from '@tanstack/react-query';
import { trackingAdminService } from '../services/tracking-admin.service';
import { trackingAdminKeys } from './keys';

export function useTrackingOverviewQuery() {
  return useQuery({
    queryKey: trackingAdminKeys.overview(),
    queryFn: trackingAdminService.getOverview,
    staleTime: 30_000,
  });
}
