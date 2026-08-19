'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { PlatformOrganization } from '../types/platform-admin.types';

export function useApproveOrganizationMutation(onSuccess?: (org: PlatformOrganization) => void) {
  const queryClient = useQueryClient();
  return useMutation<PlatformOrganization, AppError, string>({
    mutationFn: async (id) => {
      try {
        return await platformAdminService.approve(id);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizations'] });
      onSuccess?.(org);
    },
  });
}
