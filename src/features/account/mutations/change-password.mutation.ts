'use client';

import { useMutation } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { AppError } from '@/lib/http/errors';

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function useChangePasswordMutation() {
  return useMutation<void, AppError, ChangePasswordPayload>({
    mutationFn: async (payload) => {
      await httpClient.post('/auth/change-password', payload);
    },
  });
}
