'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useSetBlueprintSecretMutation() {
  const qc = useQueryClient();
  return useMutation<void, AppError, { name: string; value: string }>({
    mutationFn: wrap(({ name, value }) => blueprintsService.setSecret(name, value)),
    onSuccess: () => qc.invalidateQueries({ queryKey: blueprintKeys.secrets() }),
  });
}

export function useDeleteBlueprintSecretMutation() {
  const qc = useQueryClient();
  return useMutation<void, AppError, { name: string }>({
    mutationFn: wrap(({ name }) => blueprintsService.deleteSecret(name)),
    onSuccess: () => qc.invalidateQueries({ queryKey: blueprintKeys.secrets() }),
  });
}
