'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { PlatformRole } from '../types/platform-admin.types';

export function useChangeUserRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, { userId: string; role: PlatformRole }>({
    mutationFn: async ({ userId, role }) => {
      try {
        await platformAdminService.changeUserRole(userId, role);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-admin', 'users', 'search'] });
    },
  });
}
