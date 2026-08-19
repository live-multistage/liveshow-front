'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';

export function useSetOrgFeeOverrideMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation<unknown, AppError, { orgId: string; rate: number | null }>({
    mutationFn: async ({ orgId, rate }) => {
      try {
        return await platformAdminService.setOrgFeeOverride(orgId, rate);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'org-balances'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
      onSuccess?.();
    },
  });
}
