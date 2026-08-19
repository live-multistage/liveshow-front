'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { SessionView } from '../types/session.types';

export const sessionsKey = ['account', 'sessions'] as const;

const PAGE_SIZE = 5;

export interface SessionListPage {
  items: SessionView[];
  total: number;
  page: number;
  limit: number;
}

async function getSessions(page: number): Promise<SessionListPage> {
  const { data } = await httpClient.get<SessionListPage>('/auth/sessions', {
    params: { page, limit: PAGE_SIZE },
  });
  return data;
}

export function useSessionsQuery() {
  return useInfiniteQuery({
    queryKey: sessionsKey,
    queryFn: ({ pageParam }) => getSessions(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    staleTime: 30_000,
  });
}
