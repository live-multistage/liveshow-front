'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';

export function useRejectOrganizerApplicationMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      try {
        await platformAdminService.rejectOrganizerApplication(id, reason);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'organizer-applications'] });
      onSuccess?.();
    },
  });
}
