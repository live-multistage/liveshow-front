'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsService } from '../services/coupons.service';
import { couponsKey } from '../queries/use-coupons';
import type { CreateCouponRequest } from '../types/coupon.types';

export function useCreateCouponMutation(orgId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCouponRequest) => couponsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKey(orgId) });
    },
  });
}

export function useDeactivateCouponMutation(orgId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => couponsService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKey(orgId) });
    },
  });
}

export function useActivateCouponMutation(orgId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => couponsService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsKey(orgId) });
    },
  });
}
