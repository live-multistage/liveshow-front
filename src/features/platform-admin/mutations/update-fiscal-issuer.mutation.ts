'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { FISCAL_ISSUER_KEY } from '../queries/get-fiscal-issuer';
import type { FiscalIssuerView, UpdateFiscalIssuerRequest } from '../types/platform-admin.types';

export function useUpdateFiscalIssuerMutation() {
  const queryClient = useQueryClient();
  return useMutation<FiscalIssuerView, AppError, UpdateFiscalIssuerRequest>({
    mutationFn: async (body) => {
      try {
        return await platformAdminService.updateFiscalIssuer(body);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FISCAL_ISSUER_KEY });
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
    },
  });
}
