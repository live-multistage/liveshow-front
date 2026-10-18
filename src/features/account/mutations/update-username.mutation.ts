'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppError } from '@/lib/http/errors';
import { USERNAME_COOLDOWN_CODE } from '../utils/username-field-state';
import { useAuthContextValue } from '../context/AuthProvider';
import { accountService } from '../services/account.service';
import type { AuthUser } from '../types/account.types';

// Same session sync as useUpdateProfileMutation. A cooldown error refetches
// /auth/me so usernameChangeAvailableAt drives the field into "cooldown".
export function useUpdateUsernameMutation() {
  const queryClient = useQueryClient();
  const { login } = useAuthContextValue();

  return useMutation<AuthUser, AppError, { username: string }>({
    mutationFn: ({ username }) => accountService.updateUsername(username),
    onSuccess: (data) => {
      localStorage.setItem('user', JSON.stringify(data));
      login(data);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (error) => {
      if (error.code === USERNAME_COOLDOWN_CODE) queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
