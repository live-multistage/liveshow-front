'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adPartnerService } from '../services/ad-partner.service';
import type { AdPartnershipStatus } from '../types/ad-partner.types';

const orgKey = (organizationId: string) => ['ad-partnership', organizationId] as const;
const listKey = (status?: AdPartnershipStatus) => ['ad-partnerships', status ?? 'ALL'] as const;

export function useAdPartnershipQuery(organizationId: string | undefined) {
  return useQuery({
    queryKey: orgKey(organizationId ?? ''),
    queryFn: () => adPartnerService.dashboard(organizationId!),
    enabled: Boolean(organizationId),
    staleTime: 60_000,
  });
}

export function useApplyForPartnershipMutation(organizationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adPartnerService.apply(organizationId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgKey(organizationId ?? '') }),
  });
}

export function useAdPartnershipsQuery(status?: AdPartnershipStatus) {
  return useQuery({
    queryKey: listKey(status),
    queryFn: () => adPartnerService.list(status),
    staleTime: 30_000,
  });
}

export function useReviewPartnershipMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; action: 'approve' | 'reject' | 'suspend' | 'reinstate'; note?: string }) =>
      adPartnerService.review(vars.id, vars.action, vars.note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-partnerships'] }),
  });
}

export function useSetPartnershipRateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; rate: number | null }) => adPartnerService.setRate(vars.id, vars.rate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-partnerships'] }),
  });
}
