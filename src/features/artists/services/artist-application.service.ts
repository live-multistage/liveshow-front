import { httpClient } from '@/lib/http/client';
import type {
  CreateArtistApplicationRequest,
  ArtistApplicationResponse,
} from '../types/artist-application.types';

export const artistApplicationService = {
  create: async (payload: CreateArtistApplicationRequest): Promise<ArtistApplicationResponse> => {
    const { data } = await httpClient.post<ArtistApplicationResponse>(
      '/artist-applications',
      payload,
    );
    return data;
  },
};
