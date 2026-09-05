'use client';

import { useMutation } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type {
  OrganizerApplicationResponse,
  CreateOrganizerApplicationRequest,
} from '../types/organization.types';

export function useCreateOrganizerApplication(
  onSuccess?: (application: OrganizerApplicationResponse) => void,
) {
  return useMutation<OrganizerApplicationResponse, AppError, CreateOrganizerApplicationRequest>({
    mutationFn: async (payload) => {
      try {
        return await organizationService.createOrganizerApplication(payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess,
  });
}
