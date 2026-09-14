'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BlueprintGraph, BlueprintSummary, BlueprintVersionDto, CreateBlueprintRequest } from '@live-show/api-contracts';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { blueprintsService } from '../services/blueprints.service';
import { blueprintKeys } from '../queries/blueprints.queries';

const wrap = <A, R>(fn: (a: A) => Promise<R>) => async (a: A) => {
  try {
    return await fn(a);
  } catch (err) {
    throw normalizeError(err);
  }
};

function useInvalidate() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: blueprintKeys.list() });
    if (id) {
      qc.invalidateQueries({ queryKey: blueprintKeys.detail(id) });
      qc.invalidateQueries({ queryKey: blueprintKeys.runs(id) });
    }
  };
}

export function useCreateBlueprintMutation() {
  const invalidate = useInvalidate();
  return useMutation<BlueprintSummary, AppError, CreateBlueprintRequest>({ mutationFn: wrap(blueprintsService.create), onSuccess: () => invalidate() });
}

export function useSaveBlueprintVersionMutation() {
  const invalidate = useInvalidate();
  return useMutation<BlueprintVersionDto, AppError, { id: string; graph: BlueprintGraph }>({
    mutationFn: wrap(({ id, graph }) => blueprintsService.saveVersion(id, { graph })),
    onSuccess: (_v, { id }) => invalidate(id),
  });
}

export function usePublishBlueprintVersionMutation() {
  const invalidate = useInvalidate();
  return useMutation<BlueprintVersionDto, AppError, { id: string; versionId: string }>({
    mutationFn: wrap(({ id, versionId }) => blueprintsService.publish(id, versionId)),
    onSuccess: (_v, { id }) => invalidate(id),
  });
}

export function useActivateBlueprintMutation() {
  const invalidate = useInvalidate();
  return useMutation<void, AppError, { id: string; versionId: string }>({
    mutationFn: wrap(({ id, versionId }) => blueprintsService.activate(id, { versionId })),
    onSuccess: (_v, { id }) => invalidate(id),
  });
}

export function useDeactivateBlueprintMutation() {
  const invalidate = useInvalidate();
  return useMutation<{ cancelledRuns: number }, AppError, { id: string }>({
    mutationFn: wrap(({ id }) => blueprintsService.deactivate(id)),
    onSuccess: (_v, { id }) => invalidate(id),
  });
}
