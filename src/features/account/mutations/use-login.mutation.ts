'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { accountService } from '../services/account.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { LoginRequest, AuthResponse } from '../types/account.types';

export function useLoginMutation(callbackUrl?: string) {
  const router = useRouter();

  return useMutation<AuthResponse, AppError, LoginRequest>({
    mutationFn: async (payload) => {
      try {
        return await accountService.login(payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (data) => {
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `access_token=${data.accessToken}; path=/; SameSite=Lax`;
      router.push(callbackUrl ?? '/');
    },
  });
}
