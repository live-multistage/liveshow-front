'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { PlatformOrganization, CreateOrganizationRequest } from '../types/platform-admin.types';

export function useCreateOrganizationMutation(onSuccess?: (org: PlatformOrganization) => void) {
  const queryClient = useQueryClient();
  return useMutation<PlatformOrganization, AppError, CreateOrganizationRequest>({
    mutationFn: async (payload) => {
      try {
        return await platformAdminService.createOrganization(payload);
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
