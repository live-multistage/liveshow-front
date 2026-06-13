'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { ORGANIZATIONS_KEY } from './use-organizations';
import type { OrganizationResponse, CreateOrganizationRequest } from '../types/organization.types';

export function useCreateOrganization(onSuccess?: (org: OrganizationResponse) => void) {
  const queryClient = useQueryClient();

  return useMutation<OrganizationResponse, AppError, CreateOrganizationRequest>({
    mutationFn: async (payload) => {
      try {
        return await organizationService.create(payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_KEY });
      onSuccess?.(org);
    },
  });
}
