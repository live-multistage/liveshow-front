'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { streamsService } from '../services/streams.service';
import { normalizeError } from '@/lib/http/errors';
import { STREAM_KEYS } from '../queries/streams.queries';
import type { StreamResponse, UpdateStreamRequest } from '../types/stream.types';

export function useCreateStreamMutation(eventId: string, onSuccess?: (s: StreamResponse) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; description?: string }) => {
      try {
        return await streamsService.create(eventId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: STREAM_KEYS.byEvent(eventId) });
      onSuccess?.(data);
    },
  });
}

export function useDeleteStreamMutation(eventId: string, onSuccess?: (id: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (streamId: string) => {
      try {
        await streamsService.delete(streamId);
        return streamId;
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (streamId) => {
      qc.invalidateQueries({ queryKey: STREAM_KEYS.byEvent(eventId) });
      onSuccess?.(streamId);
    },
  });
}

function useLifecycleMutation(
  streamId: string,
  fn: (id: string) => Promise<StreamResponse>,
  eventId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        return await fn(streamId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(STREAM_KEYS.byEvent(eventId), (prev: StreamResponse[] | undefined) =>
        prev?.map((s) => (s.id === data.id ? data : s)),
      );
    },
  });
}

export function usePrepareStreamMutation(streamId: string, eventId: string) {
  return useLifecycleMutation(streamId, streamsService.prepare, eventId);
}

export function useStartStreamMutation(streamId: string, eventId: string) {
  return useLifecycleMutation(streamId, streamsService.start, eventId);
}

export function useEndStreamMutation(streamId: string, eventId: string) {
  return useLifecycleMutation(streamId, streamsService.end, eventId);
}

export function useCancelStreamMutation(streamId: string, eventId: string) {
  return useLifecycleMutation(streamId, streamsService.cancel, eventId);
}

export function useRollbackStreamMutation(streamId: string, eventId: string) {
  return useLifecycleMutation(streamId, streamsService.rollback, eventId);
}

export function useUpdateStreamMutation(eventId: string, onSuccess?: (s: StreamResponse) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ streamId, payload }: { streamId: string; payload: UpdateStreamRequest }) => {
      try {
        return await streamsService.updateStream(streamId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (data: StreamResponse) => {
      qc.setQueryData(STREAM_KEYS.byEvent(eventId), (prev: StreamResponse[] | undefined) =>
        prev?.map((s) => (s.id === data.id ? data : s)),
      );
      onSuccess?.(data);
    },
  });
}
