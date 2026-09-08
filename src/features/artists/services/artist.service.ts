import { httpClient } from '@/lib/http/client';
import type { ArtistResponse, ArtistListItem, ArtistEventsResponse } from '@live-show/api-contracts';

export const artistService = {
  /** Public endpoint — no auth required. Accepts UUID or slug. */
  getByIdOrSlug: async (slugOrId: string): Promise<ArtistResponse> => {
    const { data } = await httpClient.get<ArtistResponse>(`/artists/${slugOrId}`);
    return data;
  },

  getEvents: async (slugOrId: string, page = 1, pageSize = 24): Promise<ArtistEventsResponse> => {
    const { data } = await httpClient.get<ArtistEventsResponse>(
      `/artists/${slugOrId}/events`,
      { params: { page, pageSize } },
    );
    return data;
  },

  list: async (page = 1, pageSize = 100): Promise<{ items: ArtistListItem[]; total: number }> => {
    const { data } = await httpClient.get<{ items: ArtistListItem[]; total: number }>('/artists', {
      params: { page, pageSize },
    });
    return data;
  },
};
