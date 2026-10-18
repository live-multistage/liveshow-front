'use client';

import { useQuery } from '@tanstack/react-query';
import { normalizeUsername, usernameFormatProblem } from '@live-show/api-contracts';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { accountService } from '../services/account.service';

const AVAILABILITY_DEBOUNCE_MS = 300;

// Only well-formed, changed handles reach the API (it is rate limited).
export function useUsernameAvailability(draft: string, current: string | null) {
  const normalized = normalizeUsername(draft);
  const debounced = useDebouncedValue(normalized, AVAILABILITY_DEBOUNCE_MS);
  const shouldCheck = debounced !== (current ?? '') && usernameFormatProblem(debounced) === null;
  const query = useQuery({
    queryKey: ['account', 'username-availability', debounced],
    queryFn: () => accountService.usernameAvailability(debounced),
    enabled: shouldCheck,
    staleTime: 30_000,
  });
  const pending = normalized !== debounced;
  return {
    data: pending || !shouldCheck ? undefined : query.data,
    isChecking: pending || (shouldCheck && query.isFetching),
  };
}
