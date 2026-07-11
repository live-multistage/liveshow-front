'use client';

import { useMutation } from '@tanstack/react-query';
import type { AppError } from '@/lib/http/errors';
import { tokenStore } from '@/lib/auth/token-store';
import { useAuthContextValue } from '@/features/account/context/AuthProvider';
import type { LoginRequest, AuthUser } from '@/features/account/types/account.types';

interface DockLoginResult {
  accessToken: string;
  user: AuthUser;
}

// Deliberately not a reuse of useLoginMutation: that mutation's onSuccess calls
// router.push(safeRedirect(callbackUrl)), which inside the dock's CEF panel would
// navigate away from /broadcaster-dock/[token] — there's nowhere else for the panel
// to go. Same POST /api/auth/login endpoint (sets the access_token httpOnly cookie),
// same tokenStore/localStorage side effects, just no navigation.
export function useDockLoginMutation() {
  const { login } = useAuthContextValue();

  return useMutation<DockLoginResult, AppError, LoginRequest>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as DockLoginResult & { message?: string };
      if (!res.ok) {
        const err: AppError = { message: data.message ?? 'Login failed', status: res.status };
        throw err;
      }
      return data;
    },
    onSuccess: (data) => {
      tokenStore.set(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      login(data.user);
    },
  });
}
