'use client';

import { useQuery } from '@tanstack/react-query';
import type { ExploreRequest, FunnelRequest, ReportRange, RetentionRequest } from '@live-show/api-contracts';
import { trackingAdminService } from '../services/tracking-admin.service';
import { trackingAdminKeys } from './keys';

export function useExploreReportQuery(req: ExploreRequest | null) {
  return useQuery({
    queryKey: trackingAdminKeys.explore(req),
    queryFn: () => trackingAdminService.exploreReport(req as ExploreRequest),
    enabled: req !== null,
  });
}

export function useFunnelReportQuery(req: FunnelRequest | null) {
  return useQuery({
    queryKey: trackingAdminKeys.funnel(req),
    queryFn: () => trackingAdminService.funnelReport(req as FunnelRequest),
    enabled: req !== null,
  });
}

export function useRetentionReportQuery(req: RetentionRequest | null) {
  return useQuery({
    queryKey: trackingAdminKeys.retention(req),
    queryFn: () => trackingAdminService.retentionReport(req as RetentionRequest),
    enabled: req !== null,
  });
}

export function useFeaturesReportQuery(req: ReportRange | null) {
  return useQuery({
    queryKey: trackingAdminKeys.features(req),
    queryFn: () => trackingAdminService.featuresReport(req as ReportRange),
    enabled: req !== null,
  });
}
