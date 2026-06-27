'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { AppError } from '@/lib/http/errors';
import type { AuthUser } from '../types/account.types';

interface UpdateProfilePayload {
  displayName?: string;
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<AuthUser, AppError, UpdateProfilePayload>({
    mutationFn: async (payload) => {
      const { data } = await httpClient.patch<AuthUser>('/auth/me', payload);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('user', JSON.stringify(data));
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
