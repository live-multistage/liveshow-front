'use client';

import { useMutation } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { AppError } from '@/lib/http/errors';

// Soft-delete: disables the account (deletedAt) and revokes sessions server-side.
// Callers should log the user out on success. The danger-zone UI lands with the
// account-screen rebuild (#7).
export function useDisableAccountMutation() {
  return useMutation<void, AppError, void>({
    mutationFn: async () => {
      await httpClient.delete('/auth/me');
    },
  });
}
