'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { streamsService } from '../services/streams.service';
import { normalizeError } from '@/lib/http/errors';
import { INGEST_KEYS } from '../queries/ingest.queries';
import type { CameraIngestResponse } from '../types/stream.types';

export function useRegenerateCameraKeyMutation(cameraId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        return await streamsService.regenerateCameraKey(cameraId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (data: CameraIngestResponse) => {
      qc.setQueryData(INGEST_KEYS.cameraCreds(cameraId), data);
    },
  });
}
