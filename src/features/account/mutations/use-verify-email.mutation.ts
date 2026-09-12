'use client';

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import type { VerifyEmailRequest } from '@live-show/api-contracts';
import { accountService } from '../services/account.service';
import { normalizeError } from '@/lib/http/errors';
import type { AppError } from '@/lib/http/errors';

type VerifyEmailMutationOptions = Pick<
  UseMutationOptions<void, AppError, VerifyEmailRequest>,
  'onSuccess' | 'onError'
>;

/**
 * Backend: 200 on success, 400 { code: 'TOKEN_INVALID' } otherwise.
 *
 * Callbacks must be passed here (hook-level options) rather than to a
 * per-call `mutate(vars, { onSuccess })`: under StrictMode's simulated
 * unmount/remount, TanStack detaches the per-call observer and those
 * callbacks never fire, while hook-level options live on the mutation
 * itself and still run.
 */
export function useVerifyEmailMutation(options: VerifyEmailMutationOptions = {}) {
  return useMutation<void, AppError, VerifyEmailRequest>({
    mutationFn: async (payload) => {
      try {
        await accountService.verifyEmail(payload);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    ...options,
  });
}
