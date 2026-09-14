'use client';

import { useQuery } from '@tanstack/react-query';
import { blueprintsService } from '../services/blueprints.service';

export const blueprintKeys = {
  all: ['platform-admin', 'blueprints'] as const,
  list: () => [...blueprintKeys.all, 'list'] as const,
  detail: (id: string) => [...blueprintKeys.all, 'detail', id] as const,
  runs: (id: string) => [...blueprintKeys.all, 'runs', id] as const,
};

export function useBlueprintsQuery() {
  return useQuery({ queryKey: blueprintKeys.list(), queryFn: blueprintsService.list, staleTime: 15_000 });
}

export function useBlueprintQuery(id: string) {
  return useQuery({ queryKey: blueprintKeys.detail(id), queryFn: () => blueprintsService.get(id) });
}

export function useBlueprintRunsQuery(id: string) {
  return useQuery({ queryKey: blueprintKeys.runs(id), queryFn: () => blueprintsService.runs(id), refetchInterval: 30_000 });
}
