'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { PlatformOrganization, OrganizationStatus } from '../types/platform-admin.types';

export function useSetOrganizationStatusMutation(onSuccess?: (org: PlatformOrganization) => void) {
  const queryClient = useQueryClient();
  return useMutation<PlatformOrganization, AppError, { id: string; status: OrganizationStatus }>({
    mutationFn: async ({ id, status }) => {
      try {
        return await platformAdminService.setStatus(id, status);
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
