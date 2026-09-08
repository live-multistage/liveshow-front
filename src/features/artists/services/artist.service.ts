import { httpClient } from '@/lib/http/client';
import type {
  ArtistResponse,
  ArtistListItem,
  AdminArtistListItem,
  ArtistEventsResponse,
  ArtistInvitationItem,
  EventLineupItem,
  ArtistStatus,
} from '@live-show/api-contracts';

export interface CreateArtistRequest {
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  socialLinks?: { platform: string; url: string }[];
  genres?: string[];
  // Admin-only: assign the profile to a different user than the requester.
  ownerUserId?: string;
  status?: ArtistStatus;
}

export type UpdateArtistRequest = Partial<CreateArtistRequest>;

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

  /** Platform-admin catalog — every status, plus owner id. Admin only. */
  listAdmin: async (page = 1, pageSize = 50): Promise<{ items: AdminArtistListItem[]; total: number }> => {
    const { data } = await httpClient.get<{ items: AdminArtistListItem[]; total: number }>('/artists/admin', {
      params: { page, pageSize },
    });
    return data;
  },

  create: async (payload: CreateArtistRequest): Promise<ArtistResponse> => {
    const { data } = await httpClient.post<ArtistResponse>('/artists', payload);
    return data;
  },

  update: async (id: string, payload: UpdateArtistRequest): Promise<ArtistResponse> => {
    const { data } = await httpClient.patch<ArtistResponse>(`/artists/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await httpClient.delete(`/artists/${id}`);
  },

  /** Requester's own artist profiles (self dashboard). */
  listMine: async (): Promise<ArtistResponse[]> => {
    const { data } = await httpClient.get<ArtistResponse[]>('/artists/mine');
    return data;
  },

  listInvitations: async (artistId: string): Promise<ArtistInvitationItem[]> => {
    const { data } = await httpClient.get<ArtistInvitationItem[]>(
      `/artists/${artistId}/invitations`,
    );
    return data;
  },

  /** Event-org admin view of an event's lineup. */
  getEventLineup: async (eventId: string): Promise<EventLineupItem[]> => {
    const { data } = await httpClient.get<EventLineupItem[]>(`/artists/lineup/${eventId}`);
    return data;
  },

  invite: async (artistId: string, eventId: string): Promise<void> => {
    await httpClient.post(`/artists/${artistId}/events/${eventId}`);
  },

  respondInvite: async (
    artistId: string,
    eventId: string,
    action: 'accept' | 'decline',
  ): Promise<void> => {
    await httpClient.post(`/artists/${artistId}/events/${eventId}/${action}`);
  },

  /** Org withdraws an invite, or the artist leaves the lineup — same endpoint. */
  removeFromEvent: async (artistId: string, eventId: string): Promise<void> => {
    await httpClient.delete(`/artists/${artistId}/events/${eventId}`);
  },

  checkSlug: async (slug: string, excludeId?: string): Promise<{ available: boolean }> => {
    const { data } = await httpClient.get<{ available: boolean }>('/artists/check-slug', {
      params: { slug, ...(excludeId ? { excludeId } : {}) },
    });
    return data;
  },

  // NOTE: these two endpoints don't exist on the backend yet — mirrors the
  // organization logo/banner multipart pattern (POST /organizations/:id/settings/logo).
  // Flag to backend: add POST /artists/:id/avatar and POST /artists/:id/banner.
  uploadAvatar: async (artistId: string, file: File): Promise<{ imageUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<{ imageUrl: string }>(
      `/artists/${artistId}/avatar`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  uploadBanner: async (artistId: string, file: File): Promise<{ bannerUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<{ bannerUrl: string }>(
      `/artists/${artistId}/banner`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
