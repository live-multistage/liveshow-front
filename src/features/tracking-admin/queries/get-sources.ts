'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SourceKind } from '@live-show/api-contracts';
import { trackingAdminService } from '../services/tracking-admin.service';
import { trackingAdminKeys } from './keys';

export function useTrackingSourcesQuery() {
  return useQuery({
    queryKey: trackingAdminKeys.sources(),
    queryFn: trackingAdminService.getSources,
    staleTime: 30_000,
  });
}

export function useCreateSourceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; kind: SourceKind }) => trackingAdminService.createSource(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: trackingAdminKeys.sources() }),
  });
}

export function useRotateSourceKeyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => trackingAdminService.rotateSourceKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: trackingAdminKeys.sources() }),
  });
}

export function useUpdateSourceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; enabled?: boolean } }) =>
      trackingAdminService.updateSource(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: trackingAdminKeys.sources() }),
  });
}
