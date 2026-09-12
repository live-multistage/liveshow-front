'use client';

import { useMutation } from '@tanstack/react-query';
import type { EmailOnlyRequest } from '@live-show/api-contracts';
import { accountService } from '../services/account.service';
import { normalizeError } from '@/lib/http/errors';
import type { AppError } from '@/lib/http/errors';

/** Always 202 on the backend — errors here mean the request itself failed (network/5xx). */
export function useResendVerificationMutation() {
  return useMutation<void, AppError, EmailOnlyRequest>({
    mutationFn: async (payload) => {
      try {
        await accountService.resendVerification(payload);
      } catch (e) {
        throw normalizeError(e);
      }
    },
  });
}
