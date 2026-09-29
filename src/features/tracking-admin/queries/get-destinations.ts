'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackingAdminService } from '../services/tracking-admin.service';
import { trackingAdminKeys } from './keys';

export function useDestinationsQuery() {
  return useQuery({
    queryKey: trackingAdminKeys.destinations(),
    queryFn: trackingAdminService.getDestinations,
    staleTime: 30_000,
  });
}

export function useCreateDestinationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; url: string; eventFilter: string[] }) =>
      trackingAdminService.createDestination(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: trackingAdminKeys.destinations() }),
  });
}

export function useUpdateDestinationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { name?: string; url?: string; eventFilter?: string[]; enabled?: boolean };
    }) => trackingAdminService.updateDestination(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: trackingAdminKeys.destinations() }),
  });
}

export function useDeleteDestinationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => trackingAdminService.deleteDestination(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: trackingAdminKeys.destinations() }),
  });
}

export function useDestinationDeliveriesQuery(id: string, limit = 50) {
  return useQuery({
    queryKey: trackingAdminKeys.deliveries(id),
    queryFn: () => trackingAdminService.getDestinationDeliveries(id, limit),
    staleTime: 15_000,
  });
}

export function useTestDestinationMutation() {
  return useMutation({
    mutationFn: (id: string) => trackingAdminService.testDestination(id),
  });
}
