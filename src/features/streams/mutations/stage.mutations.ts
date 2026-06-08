'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { streamsService } from '../services/streams.service';
import { normalizeError } from '@/lib/http/errors';
import { STREAM_KEYS } from '../queries/streams.queries';

export function useCreateStageMutation(streamId: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      try {
        return await streamsService.createStage(streamId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STREAM_KEYS.stages(streamId) });
      onSuccess?.();
    },
  });
}

export function useDeleteStageMutation(streamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stageId: string) => {
      try {
        await streamsService.deleteStage(stageId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STREAM_KEYS.stages(streamId) });
    },
  });
}
