'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';

export function useRetryFiscalDocumentMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (id) => {
      try {
        return await platformAdminService.retryFiscalDocument(id);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'fiscal', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'audit'] });
      onSuccess?.();
    },
  });
}
