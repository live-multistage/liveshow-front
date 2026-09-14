'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { BlueprintRunStatus } from '@live-show/api-contracts';
import { blueprintsService } from '../services/blueprints.service';

export const blueprintKeys = {
  all: ['platform-admin', 'blueprints'] as const,
  list: () => [...blueprintKeys.all, 'list'] as const,
  detail: (id: string) => [...blueprintKeys.all, 'detail', id] as const,
  // A bare prefix (no status) so mutations can invalidate every filter chip's
  // cached pages at once; the query itself appends the status below.
  runs: (id: string) => [...blueprintKeys.all, 'runs', id] as const,
};

export function useBlueprintsQuery() {
  return useQuery({ queryKey: blueprintKeys.list(), queryFn: blueprintsService.list, staleTime: 15_000 });
}

export function useBlueprintQuery(id: string) {
  return useQuery({ queryKey: blueprintKeys.detail(id), queryFn: () => blueprintsService.get(id) });
}

// One filter chip ("Todas" = undefined) drives the query key so switching
// filters starts a fresh cursor chain; "Carregar mais" appends further pages
// via fetchNextPage, and the 30s poll refetches every page already loaded.
export function useBlueprintRunsQuery(id: string, status?: BlueprintRunStatus) {
  return useInfiniteQuery({
    queryKey: [...blueprintKeys.runs(id), status ?? 'ALL'],
    queryFn: ({ pageParam }: { pageParam?: string }) => blueprintsService.runs(id, { status, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: 30_000,
  });
}
