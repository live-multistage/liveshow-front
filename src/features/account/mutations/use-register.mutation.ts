'use client';

import { useMutation } from '@tanstack/react-query';
import type { AppError } from '@/lib/http/errors';
import type { RegisterRequest } from '../types/account.types';
import type { RegisterResponse } from '@live-show/api-contracts';

/**
 * Registration no longer signs the user in — the backend never issues a
 * session (`201 { verificationRequired: true }` for both a new and an
 * already-registered email). The caller shows a "check your email" state;
 * nothing here touches tokenStore/localStorage/AuthProvider.
 */
export function useRegisterMutation() {
  return useMutation<RegisterResponse, AppError, RegisterRequest>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as RegisterResponse & { message?: string; code?: string };
      if (!res.ok) {
        const err: AppError = { message: data.message ?? 'Registration failed', status: res.status, code: data.code };
        throw err;
      }
      return data;
    },
  });
}
