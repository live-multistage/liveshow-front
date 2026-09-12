'use client';

import { useMutation } from '@tanstack/react-query';
import type { VerifyEmailRequest } from '@live-show/api-contracts';
import { accountService } from '../services/account.service';
import { normalizeError } from '@/lib/http/errors';
import type { AppError } from '@/lib/http/errors';

/** Backend: 200 on success, 400 { code: 'TOKEN_INVALID' } otherwise. */
export function useVerifyEmailMutation() {
  return useMutation<void, AppError, VerifyEmailRequest>({
    mutationFn: async (payload) => {
      try {
        await accountService.verifyEmail(payload);
      } catch (e) {
        throw normalizeError(e);
      }
    },
  });
}
