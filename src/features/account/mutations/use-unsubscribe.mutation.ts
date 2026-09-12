'use client';

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { accountService } from '../services/account.service';
import { normalizeError, type AppError } from '@/lib/http/errors';

type UnsubscribeMutationOptions = Pick<
  UseMutationOptions<void, AppError, string>,
  'onSuccess' | 'onError'
>;

/**
 * Backend: 200 on success (idempotent), 400 TOKEN_INVALID.
 *
 * Callbacks must be passed here (hook-level options) rather than to a
 * per-call `mutate(vars, { onSuccess })`: under StrictMode's simulated
 * unmount/remount, TanStack detaches the per-call observer and those
 * callbacks never fire, while hook-level options live on the mutation
 * itself and still run.
 */
export function useUnsubscribeMutation(options: UnsubscribeMutationOptions = {}) {
  return useMutation<void, AppError, string>({
    mutationFn: async (token) => {
      try {
        await accountService.unsubscribe(token);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    ...options,
  });
}
