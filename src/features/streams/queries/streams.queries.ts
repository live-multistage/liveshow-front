'use client';

import { useQuery } from '@tanstack/react-query';
import { streamsService } from '../services/streams.service';

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
