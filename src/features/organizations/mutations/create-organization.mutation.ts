'use client';

import { useMutation } from '@tanstack/react-query';
import { organizationsService } from '../api/organizations.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { OrganizationResponse, CreateOrganizationRequest } from '../types/organization.types';

export function useCreateOrganizationMutation(onSuccess?: (org: OrganizationResponse) => void) {
  return useMutation<OrganizationResponse, AppError, CreateOrganizationRequest>({
    mutationFn: async (payload) => {
      try {
        return await organizationsService.create(payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess,
  });
}
