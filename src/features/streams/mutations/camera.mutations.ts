'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { streamsService } from '../services/streams.service';
import { normalizeError } from '@/lib/http/errors';
import { STREAM_KEYS } from '../queries/streams.queries';
import type { CameraResponse } from '../types/stream.types';

export function useCreateCameraMutation(feedId: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; priority?: number }) => {
      try {
        return await streamsService.createCamera(feedId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STREAM_KEYS.cameras(feedId) });
      onSuccess?.();
    },
  });
}

export function useToggleCameraMutation(feedId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cameraId, enabled }: { cameraId: string; enabled: boolean }) => {
      try {
        return enabled
          ? await streamsService.enableCamera(cameraId)
          : await streamsService.disableCamera(cameraId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (data: CameraResponse) => {
      qc.setQueryData(
        STREAM_KEYS.cameras(feedId),
        (prev: CameraResponse[] | undefined) =>
          prev?.map((c) => (c.id === data.id ? data : c)),
      );
    },
  });
}

// Optional fallback poster shown when a camera has no live signal.
export function useUploadCameraThumbnailMutation(cameraId: string, feedId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      try {
        return await streamsService.uploadCameraThumbnail(cameraId, file);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STREAM_KEYS.cameras(feedId) });
    },
    onError: () => {
      toast.error('Falha ao enviar a thumbnail da câmera.');
    },
  });
}

// Clears the custom thumbnail (falls back to the platform default poster).
export function useClearCameraThumbnailMutation(cameraId: string, feedId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        return await streamsService.updateCamera(cameraId, { thumbnailUrl: null });
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STREAM_KEYS.cameras(feedId) });
    },
    onError: () => {
      toast.error('Falha ao remover a thumbnail da câmera.');
    },
  });
}
