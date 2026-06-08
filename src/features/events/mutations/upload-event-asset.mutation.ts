'use client';

import { useMutation } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { EventPhotoResponse, EventResponse } from '../types/event.types';

export function useUploadAssetMutation(eventId: string) {
  return useMutation<EventResponse, AppError, { assetType: 'banner' | 'thumbnail'; file: File }>({
    mutationFn: async ({ assetType, file }) => {
      try {
        return await eventsService.uploadAsset(eventId, assetType, file);
      } catch (err) {
        throw normalizeError(err);
      }
    },
  });
}

export function useUploadGalleryPhotoMutation(eventId: string) {
  return useMutation<EventPhotoResponse, AppError, File>({
    mutationFn: async (file) => {
      try {
        return await eventsService.uploadGalleryPhoto(eventId, file);
      } catch (err) {
        throw normalizeError(err);
      }
    },
  });
}
