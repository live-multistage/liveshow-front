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
      if (!url.startsWith('https://')) {
        throw new Error('URL de redirecionamento inválida');
      }
      window.location.href = url;
    },
  });
}
