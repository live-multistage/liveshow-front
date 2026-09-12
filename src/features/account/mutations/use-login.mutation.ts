'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AppError } from '@/lib/http/errors';
import { tokenStore } from '@/lib/auth/token-store';
import { safeRedirect } from '@/lib/auth/safe-redirect';
import { useAuthContextValue } from '../context/AuthProvider';
import type { LoginRequest, AuthUser } from '../types/account.types';

interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export function useLoginMutation(callbackUrl?: string) {
  const router = useRouter();
  const { login } = useAuthContextValue();

  return useMutation<LoginResult, AppError, LoginRequest>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as LoginResult & { message?: string; code?: string };
      if (!res.ok) {
        // A 429 from the rate limiter has no JSON `code` of its own — map it
        // to the same key mobile uses so the UI never shows a raw message.
        const code = data.code ?? (res.status === 429 ? 'TOO_MANY_ATTEMPTS' : undefined);
        const err: AppError = { message: data.message ?? 'Login failed', status: res.status, code };
        throw err;
      }
      return data;
    },
    onSuccess: (data) => {
      tokenStore.set(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data.user);
      router.push(safeRedirect(callbackUrl));
    },
  });
}
