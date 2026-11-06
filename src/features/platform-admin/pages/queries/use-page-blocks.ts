'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePageBlockRequest, PageBlockResponse } from '@live-show/api-contracts';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { pageBlocksService } from '../services/page-blocks.service';
import { pageKeys } from './page.keys';

export const pageBlockKeys = { all: [...pageKeys.all, 'blocks'] as const };

export function usePageBlocksQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: pageBlockKeys.all,
    queryFn: () => pageBlocksService.list(),
    enabled: options.enabled ?? true,
    refetchOnWindowFocus: false,
  });
}

export function useCreatePageBlockMutation() {
  const qc = useQueryClient();
  return useMutation<PageBlockResponse, AppError, CreatePageBlockRequest>({
    mutationFn: async (body) => {
      try {
        return await pageBlocksService.create(body);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: pageBlockKeys.all }),
  });
}
