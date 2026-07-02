'use client';

import { useQuery, useQueries } from '@tanstack/react-query';
import { streamsService } from '../services/streams.service';
import { STREAM_KEYS } from './streams.queries';

export const INGEST_KEYS = {
  feed: (feedId: string) => ['ingest', 'feed', feedId] as const,
  cameraJob: (cameraId: string) => ['transcode', 'camera', cameraId] as const,
  cameraCreds: (cameraId: string) => ['ingest', 'camera', cameraId] as const,
  // Distinct from STREAM_KEYS.feeds/cameras on purpose: those queryFns return
  // bare FeedResponse[]/CameraResponse[] (StageBody/FeedBody .map() over them
  // directly). These return a differently-shaped {feeds/cams, stageName}
  // wrapper for on-air lookup — sharing a key would let whichever query wins
  // the cache race overwrite the other with the wrong shape.
  onAirFeeds: (stageId: string) => ['on-air', 'feeds', stageId] as const,
  onAirCameras: (feedId: string) => ['on-air', 'cameras', feedId] as const,
};

// Live ingest state per camera. Polls while `live` so the "receiving signal"
// dot reflects reality; caller passes `enabled` (stream is LIVE/READY).
export function useFeedIngestQuery(feedId: string, enabled: boolean) {
  return useQuery({
    queryKey: INGEST_KEYS.feed(feedId),
    queryFn: () => streamsService.getFeedIngest(feedId),
    enabled,
    refetchInterval: enabled ? 5000 : false,
  });
}

// Active transcode job for a camera (null when none). Polls while enabled.
export function useActiveTranscodeJobQuery(cameraId: string, enabled: boolean) {
  return useQuery({
    queryKey: INGEST_KEYS.cameraJob(cameraId),
    queryFn: () => streamsService.getActiveTranscodeJob(cameraId),
    enabled,
    refetchInterval: enabled ? 5000 : false,
  });
}

// On-demand fetch of the secret OBS credentials. Not auto-polled; `enabled`
// flips when the user opens the credentials panel.
export function useCameraIngestQuery(cameraId: string, enabled: boolean) {
  return useQuery({
    queryKey: INGEST_KEYS.cameraCreds(cameraId),
    queryFn: () => streamsService.getCameraIngest(cameraId),
    enabled,
    staleTime: 60_000,
  });
}

export interface OnAirCamera {
  cameraId: string;
  cameraName: string;
  stageName: string;
  packageId: string;
}

// Walks this stream's stages → feeds → cameras and returns the first camera
// with a RUNNING transcode job — i.e. what's actually on air right now.
// Same useQueries fan-out pattern as useEventCamerasQuery in streams.queries.ts,
// scoped to one stream instead of every stream under the event.
export function useOnAirCamera(streamId: string | null, enabled: boolean): {
  onAir: OnAirCamera | null;
  isLoading: boolean;
} {
  const stagesQuery = useQuery({
    queryKey: STREAM_KEYS.stages(streamId ?? ''),
    queryFn: () => streamsService.listStages(streamId!),
    enabled: enabled && !!streamId,
  });
  const stages = stagesQuery.data ?? [];

  const feedQueries = useQueries({
    queries: stages.map((stage) => ({
      queryKey: INGEST_KEYS.onAirFeeds(stage.id),
      queryFn: async () => ({ feeds: await streamsService.listFeeds(stage.id), stageName: stage.name }),
      enabled: enabled && stages.length > 0,
    })),
  });
  const feedsWithStage = feedQueries.flatMap((q) =>
    q.data ? q.data.feeds.map((feed) => ({ feed, stageName: q.data!.stageName })) : [],
  );

  const cameraQueries = useQueries({
    queries: feedsWithStage.map(({ feed, stageName }) => ({
      queryKey: INGEST_KEYS.onAirCameras(feed.id),
      queryFn: async () => {
        const cams = await streamsService.listCameras(feed.id);
        return cams.map((c) => ({ ...c, stageName }));
      },
      enabled: enabled && feedsWithStage.length > 0,
    })),
  });
  const cameras = cameraQueries.flatMap((q) => q.data ?? []);

  const jobQueries = useQueries({
    queries: cameras.map((cam) => ({
      queryKey: INGEST_KEYS.cameraJob(cam.id),
      queryFn: () => streamsService.getActiveTranscodeJob(cam.id),
      enabled: enabled && cameras.length > 0,
      refetchInterval: enabled ? 5000 : false,
    })),
  });

  let onAir: OnAirCamera | null = null;
  jobQueries.forEach((q, i) => {
    if (onAir || !q.data || q.data.status !== 'RUNNING') return;
    const cam = cameras[i];
    onAir = { cameraId: cam.id, cameraName: cam.name, stageName: cam.stageName, packageId: q.data.packageId };
  });

  const isLoading =
    stagesQuery.isLoading ||
    feedQueries.some((q) => q.isLoading) ||
    cameraQueries.some((q) => q.isLoading);

  return { onAir, isLoading };
}
