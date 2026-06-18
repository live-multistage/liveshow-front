'use client';

import { useQuery, useQueries } from '@tanstack/react-query';
import { streamsService } from '../services/streams.service';
import type { StageResponse } from '../types/stream.types';

export const STREAM_KEYS = {
  byEvent: (eventId: string) => ['streams', 'by-event', eventId] as const,
  stages: (streamId: string) => ['streams', streamId, 'stages'] as const,
  feeds: (stageId: string) => ['stages', stageId, 'feeds'] as const,
  cameras: (feedId: string) => ['feeds', feedId, 'cameras'] as const,
};

export function useEventStreamsQuery(eventId: string | null) {
  return useQuery({
    queryKey: STREAM_KEYS.byEvent(eventId ?? ''),
    queryFn: () => streamsService.listByEvent(eventId!),
    enabled: !!eventId,
  });
}

export function useStreamStagesQuery(streamId: string | null) {
  return useQuery({
    queryKey: STREAM_KEYS.stages(streamId ?? ''),
    queryFn: () => streamsService.listStages(streamId!),
    enabled: !!streamId,
  });
}

export function useStageFeedsQuery(stageId: string | null) {
  return useQuery({
    queryKey: STREAM_KEYS.feeds(stageId ?? ''),
    queryFn: () => streamsService.listFeeds(stageId!),
    enabled: !!stageId,
  });
}

export function useFeedCamerasQuery(feedId: string | null) {
  return useQuery({
    queryKey: STREAM_KEYS.cameras(feedId ?? ''),
    queryFn: () => streamsService.listCameras(feedId!),
    enabled: !!feedId,
  });
}

export function useEventStagesQuery(eventId: string | null): {
  stages: StageResponse[];
  isLoading: boolean;
} {
  const streamsQuery = useEventStreamsQuery(eventId);
  const streamIds = streamsQuery.data?.map((s) => s.id) ?? [];

  const stageQueries = useQueries({
    queries: streamIds.map((streamId) => ({
      queryKey: STREAM_KEYS.stages(streamId),
      queryFn: () => streamsService.listStages(streamId),
    })),
  });

  const stages = stageQueries.flatMap((q) => q.data ?? []);
  const isLoading = streamsQuery.isLoading || stageQueries.some((q) => q.isLoading);

  return { stages, isLoading };
}
