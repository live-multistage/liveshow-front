'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';

interface AuthCheckResult {
  allowed: boolean;
  reason?: string;
}

export function useAuthCheck(
  action: string,
  context?: Record<string, unknown>,
  options?: { enabled?: boolean },
) {
  return useQuery<AuthCheckResult>({
    queryKey: ['auth-check', action, context],
    queryFn: async () => {
      const { data } = await httpClient.post<AuthCheckResult>('/auth/check', {
        action,
        context: context ?? {},
      });
      return data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    retry: false,
  });
}
