'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { streamsService } from '../services/streams.service';
import { normalizeError } from '@/lib/http/errors';
import { STREAM_KEYS } from '../queries/streams.queries';

export function useCreateFeedMutation(stageId: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      try {
        return await streamsService.createFeed(stageId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STREAM_KEYS.feeds(stageId) });
      onSuccess?.();
    },
  });
}

export function useDeleteFeedMutation(stageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (feedId: string) => {
      try {
        await streamsService.deleteFeed(feedId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STREAM_KEYS.feeds(stageId) });
    },
  });
}
