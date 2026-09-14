'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { BlueprintRunStatus } from '@live-show/api-contracts';
import { blueprintsService } from '../services/blueprints.service';

export const blueprintKeys = {
  all: ['platform-admin', 'blueprints'] as const,
  list: () => [...blueprintKeys.all, 'list'] as const,
  catalog: () => [...blueprintKeys.all, 'catalog'] as const,
  detail: (id: string) => [...blueprintKeys.all, 'detail', id] as const,
  // A bare prefix (no status) so mutations can invalidate every filter chip's
  // cached pages at once; the query itself appends the status below.
  runs: (id: string) => [...blueprintKeys.all, 'runs', id] as const,
  runChildren: (id: string, runId: string) => [...blueprintKeys.all, 'runChildren', id, runId] as const,
  secrets: () => [...blueprintKeys.all, 'secrets'] as const,
};

export function useBlueprintsQuery() {
  return useQuery({ queryKey: blueprintKeys.list(), queryFn: blueprintsService.list, staleTime: 15_000 });
}

// The catalog only changes on deploy (plugins register at boot).
export function useBlueprintCatalogQuery() {
  return useQuery({ queryKey: blueprintKeys.catalog(), queryFn: blueprintsService.catalog, staleTime: 5 * 60_000 });
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

// Children of a core.forEach parent run, fetched only once the parent row is
// expanded or its drawer is open (`enabled`); no polling — a stale child list
// just needs a manual "carregar mais" / retry.
export function useBlueprintRunChildrenQuery(id: string, runId: string, options: { enabled: boolean }) {
  return useInfiniteQuery({
    queryKey: blueprintKeys.runChildren(id, runId),
    queryFn: ({ pageParam }: { pageParam?: string }) => blueprintsService.runChildren(id, runId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: options.enabled,
  });
}
