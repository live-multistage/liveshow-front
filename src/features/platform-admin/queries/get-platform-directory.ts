'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { eventsService } from '@/features/events/services/events.service';
import type { EventModerationAction } from '../types/platform-admin.types';
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
  return useMutation<void, AppError, { id: string; action: EventModerationAction; reason?: string }>({
    mutationFn: async ({ id, action, reason }) => {
      try { await platformAdminService.moderateEvent(id, action, reason); }
      catch (err) { throw normalizeError(err); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin', 'events'] });
      qc.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
      onDone?.();
    },
  });
}

// Super-admin signs off NBR 15290 accessibility for a publicly-funded event.
export function useApproveAccessibilityMutation(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (eventId) => {
      try { await eventsService.approveAccessibility(eventId); }
      catch (err) { throw normalizeError(err); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin', 'events'] });
      qc.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
      onDone?.();
    },
  });
}

function invalidateAds(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['platform-admin', 'ads'] });
  qc.invalidateQueries({ queryKey: ['platform-admin', 'ad-detail'] });
  qc.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
}

export function useAdDetailQuery(id: string | null) {
  return useQuery({
    queryKey: ['platform-admin', 'ad-detail', id] as const,
    queryFn: () => platformAdminService.getAdDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useReviewConfigQuery() {
  return useQuery({
    queryKey: ['platform-admin', 'ad-review-config'] as const,
    queryFn: platformAdminService.getAdReviewConfig,
    staleTime: 60_000,
  });
}

export function useSetReviewStrategyMutation(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation<{ strategy: string }, AppError, string>({
    mutationFn: async (strategy) => {
      try { return await platformAdminService.setAdReviewStrategy(strategy); }
      catch (err) { throw normalizeError(err); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-admin', 'ad-review-config'] });
      qc.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
      onDone?.();
    },
  });
}

export function useReviewAdMutation(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation<void, AppError, { id: string; decision: 'APPROVE' | 'REJECT'; reason?: string }>({
    mutationFn: async ({ id, decision, reason }) => {
      try { await platformAdminService.reviewAd(id, decision, reason); }
      catch (err) { throw normalizeError(err); }
    },
    onSuccess: () => { invalidateAds(qc); onDone?.(); },
  });
}

export function usePauseResumeAdMutation(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation<void, AppError, { id: string; action: 'pause' | 'resume' }>({
    mutationFn: async ({ id, action }) => {
      try { await (action === 'pause' ? platformAdminService.pauseAd(id) : platformAdminService.resumeAd(id)); }
      catch (err) { throw normalizeError(err); }
    },
    onSuccess: () => { invalidateAds(qc); onDone?.(); },
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
