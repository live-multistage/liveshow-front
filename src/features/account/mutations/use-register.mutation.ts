'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AppError } from '@/lib/http/errors';
import { tokenStore } from '@/lib/auth/token-store';
import type { RegisterRequest, AuthUser } from '../types/account.types';

interface RegisterResult {
  accessToken: string;
  user: AuthUser;
}

function safeRedirect(url: string | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}

export function useRegisterMutation(callbackUrl?: string) {
  const router = useRouter();

  return useMutation<RegisterResult, AppError, RegisterRequest>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as RegisterResult & { message?: string };
      if (!res.ok) {
        const err: AppError = { message: data.message ?? 'Registration failed', status: res.status };
        throw err;
      }
      return data;
    },
    onSuccess: (data) => {
      tokenStore.set(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push(safeRedirect(callbackUrl));
    },
  });
}
