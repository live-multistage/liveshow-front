'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';

export function usePayoutOrgMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation<unknown, AppError, string>({
    mutationFn: async (orgId) => {
      try {
        return await platformAdminService.payoutOrg(orgId);
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
