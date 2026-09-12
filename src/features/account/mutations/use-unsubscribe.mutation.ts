'use client';

import { useMutation } from '@tanstack/react-query';
import { accountService } from '../services/account.service';
import { normalizeError, type AppError } from '@/lib/http/errors';

/** Backend: 200 on success (idempotent), 400 TOKEN_INVALID, 404 while mailing is off. */
export function useUnsubscribeMutation() {
  return useMutation<void, AppError, string>({
    mutationFn: async (token) => {
      try {
        await accountService.unsubscribe(token);
      } catch (e) {
        throw normalizeError(e);
      }
    },
  });
}
