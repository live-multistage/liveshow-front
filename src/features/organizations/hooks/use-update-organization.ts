'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { organizationKey, ORGANIZATIONS_KEY } from './use-organizations';
import type { OrganizationResponse, UpdateOrganizationRequest } from '../types/organization.types';

export function useUpdateOrganization(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrganizationResponse, AppError, UpdateOrganizationRequest>({
    mutationFn: async (payload) => {
      try {
        return await organizationService.update(orgId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKey(orgId) });
      queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
    },
  });
}
