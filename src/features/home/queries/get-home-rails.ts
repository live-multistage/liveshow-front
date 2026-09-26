'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { HomeRailsResponse } from '@live-show/api-contracts';
import { useAuth } from '@/features/account/hooks/use-auth';
import { homeService } from '../services/home.service';

export const homeKeys = {
  all: ['home'] as const,
  // isLoggedIn in the key so login/logout refetches — the response is
  // personalized when a token is sent, public otherwise.
  rails: (isLoggedIn: boolean) => [...homeKeys.all, 'rails', isLoggedIn] as const,
};

// Public: no `enabled` gate — same rail feed loads for anonymous visitors,
// including before auth has hydrated (isLoggedIn starts false either way,
// and the queryKey already includes isLoggedIn so login/logout refetches).
export function useHomeRailsQuery(initialPage?: HomeRailsResponse) {
  const { isLoggedIn } = useAuth();
  return useInfiniteQuery({
    queryKey: homeKeys.rails(isLoggedIn),
    queryFn: ({ pageParam }) => homeService.rails({ cursor: pageParam, limit: 4 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: initialPage ? { pages: [initialPage], pageParams: [undefined] } : undefined,
    staleTime: 60_000,
  });
}
