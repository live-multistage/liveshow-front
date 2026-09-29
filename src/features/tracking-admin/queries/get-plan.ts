'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlanEvent } from '@live-show/api-contracts';
import { trackingAdminService } from '../services/tracking-admin.service';
import { trackingAdminKeys } from './keys';

export function useTrackingPlanQuery() {
  return useQuery({
    queryKey: trackingAdminKeys.plan(),
    queryFn: trackingAdminService.getPlan,
    staleTime: 30_000,
  });
}

export function useUnplannedEventsQuery() {
  return useQuery({
    queryKey: trackingAdminKeys.unplanned(),
    queryFn: trackingAdminService.getUnplannedEvents,
    staleTime: 30_000,
  });
}

export function useUpsertPlanEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, payload }: { name: string; payload: Omit<PlanEvent, 'name' | 'updatedAt'> }) =>
      trackingAdminService.upsertPlanEvent(name, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: trackingAdminKeys.plan() }),
  });
}

export function useDeletePlanEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => trackingAdminService.deletePlanEvent(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: trackingAdminKeys.plan() }),
  });
}
