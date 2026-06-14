'use client';

import { useQuery } from '@tanstack/react-query';
import { streamsService } from '../services/streams.service';

export const INGEST_KEYS = {
  feed: (feedId: string) => ['ingest', 'feed', feedId] as const,
  cameraJob: (cameraId: string) => ['transcode', 'camera', cameraId] as const,
  cameraCreds: (cameraId: string) => ['ingest', 'camera', cameraId] as const,
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
