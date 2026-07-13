'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { AppError } from '@/lib/http/errors';
import { sessionsKey } from '../queries/get-sessions';

// Revoke one session (log out that device). The current session can be revoked
// too — the caller decides whether that means logging the user out here.
export function useRevokeSessionMutation() {
  const qc = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (sessionId) => {
      await httpClient.delete(`/auth/sessions/${sessionId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sessionsKey });
    },
  });
}
