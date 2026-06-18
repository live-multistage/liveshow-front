'use client';

import { useQuery, useQueries } from '@tanstack/react-query';
import { streamsService } from '../services/streams.service';
import type { StageResponse, CameraResponse, FeedResponse } from '../types/stream.types';

export interface CameraWithContext extends CameraResponse {
  stageName: string;
  stageSlug: string;
  feedName: string;
}

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

// ── Full camera list for an event (streams → stages → feeds → cameras) ───────

export function useEventCamerasQuery(eventId: string | null): {
  cameras: CameraWithContext[];
  isLoading: boolean;
} {
  const streamsQuery = useEventStreamsQuery(eventId);
  const streamIds = streamsQuery.data?.map((s) => s.id) ?? [];

  const stageQueries = useQueries({
    queries: streamIds.map((streamId) => ({
      queryKey: STREAM_KEYS.stages(streamId),
      queryFn: () => streamsService.listStages(streamId),
      enabled: streamIds.length > 0,
    })),
  });

  const stages = stageQueries.flatMap((q) => q.data ?? []);

  const feedQueries = useQueries({
    queries: stages.map((stage) => ({
      queryKey: STREAM_KEYS.feeds(stage.id),
      queryFn: async (): Promise<{ feeds: FeedResponse[]; stage: StageResponse }> => ({
        feeds: await streamsService.listFeeds(stage.id),
        stage,
      }),
      enabled: stages.length > 0,
    })),
  });

  const feedsWithStage = feedQueries.flatMap((q) => {
    if (!q.data) return [];
    return q.data.feeds.map((feed) => ({ feed, stage: q.data!.stage }));
  });

  const cameraQueries = useQueries({
    queries: feedsWithStage.map(({ feed, stage }) => ({
      queryKey: STREAM_KEYS.cameras(feed.id),
      queryFn: async (): Promise<CameraWithContext[]> => {
        const cams = await streamsService.listCameras(feed.id);
        return cams.map((c) => ({
          ...c,
          stageName: stage.name,
          stageSlug: stage.slug,
          feedName: feed.name,
        }));
      },
      enabled: feedsWithStage.length > 0,
    })),
  });

  const cameras = cameraQueries
    .flatMap((q) => q.data ?? [])
    .sort((a, b) => a.priority - b.priority);

  const isLoading =
    streamsQuery.isLoading ||
    stageQueries.some((q) => q.isLoading) ||
    feedQueries.some((q) => q.isLoading) ||
    cameraQueries.some((q) => q.isLoading);

  return { cameras, isLoading };
}
