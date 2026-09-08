'use client';

import { useMutation } from '@tanstack/react-query';
import { artistApplicationService } from '../services/artist-application.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type {
  ArtistApplicationResponse,
  CreateArtistApplicationRequest,
} from '../types/artist-application.types';

export function useCreateArtistApplication(
  onSuccess?: (application: ArtistApplicationResponse) => void,
) {
  return useMutation<ArtistApplicationResponse, AppError, CreateArtistApplicationRequest>({
    mutationFn: async (payload) => {
      try {
        return await artistApplicationService.create(payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess,
  });
}
