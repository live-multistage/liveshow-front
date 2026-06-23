'use client';

import { useMutation } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import { normalizeError, type AppError } from '@/lib/http/errors';

export function useInitiateStripeConnect(orgId: string) {
  return useMutation<{ url: string }, AppError, void>({
    mutationFn: async () => {
      try {
        return await organizationService.initiateStripeConnect(orgId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
