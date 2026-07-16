'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';

export function useRevenueBreakdownQuery(range: '7d' | '30d' | '90d') {
  return useQuery({
    queryKey: ['platform-admin', 'revenue-breakdown', range] as const,
    queryFn: () => platformAdminService.getRevenueBreakdown(range),
    staleTime: 60_000,
  });
}

export function usePlatformEventsQuery(params: { status?: string; q?: string; page?: number }) {
  return useQuery({
    queryKey: ['platform-admin', 'events', params] as const,
    queryFn: () => platformAdminService.getPlatformEvents(params),
    staleTime: 30_000,
  });
}

export function usePlatformAdsQuery(params: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['platform-admin', 'ads', params] as const,
    queryFn: () => platformAdminService.getPlatformAds(params),
    staleTime: 30_000,
  });
}

export function usePlatformCouponsQuery(params: { status?: string; q?: string; page?: number }) {
  return useQuery({
    queryKey: ['platform-admin', 'coupons', params] as const,
    queryFn: () => platformAdminService.getPlatformCoupons(params),
    staleTime: 30_000,
  });
}

export function useModerateEventMutation(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation<void, AppError, { id: string; action: 'UNPUBLISH' | 'CANCEL' }>({
    mutationFn: async ({ id, action }) => {
      try { await platformAdminService.moderateEvent(id, action); }
      catch (err) { throw normalizeError(err); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin', 'events'] });
      qc.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
      onDone?.();
    },
  });
}

export function useModerateAdMutation(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation<void, AppError, { id: string; action: 'APPROVE' | 'PAUSE' | 'RESUME' }>({
    mutationFn: async ({ id, action }) => {
      try { await platformAdminService.moderateAd(id, action); }
      catch (err) { throw normalizeError(err); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin', 'ads'] });
      qc.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
      onDone?.();
    },
  });
}

export function useDeactivateCouponMutation(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (id) => {
      try { await platformAdminService.deactivateCoupon(id); }
      catch (err) { throw normalizeError(err); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin', 'coupons'] });
      qc.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
      onDone?.();
    },
  });
}
