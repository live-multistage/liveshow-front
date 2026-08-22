import { httpClient } from '@/lib/http/client';
import type {
  CreateSeriesInput,
  SeriesDetail,
  SeriesEpisodeDetail,
  SeriesListItem,
  SeriesResponse,
  SeriesTicketProduct,
  UpdateSeriesInput,
  UpsertSeriesTicketProductInput,
} from '../types/series.types';

export const seriesService = {
  list: async (): Promise<SeriesListItem[]> => {
    const { data } = await httpClient.get<SeriesListItem[]>('/series');
    return data;
  },

  getBySlug: async (slug: string): Promise<SeriesDetail> => {
    const { data } = await httpClient.get<SeriesDetail>(`/series/${slug}`);
    return data;
  },

  listByOrg: async (organizationId: string): Promise<SeriesResponse[]> => {
    const { data } = await httpClient.get<SeriesResponse[]>(
      `/organizations/${organizationId}/series`,
    );
    return data;
  },

  create: async (input: CreateSeriesInput): Promise<SeriesResponse> => {
    const { data } = await httpClient.post<SeriesResponse>('/series', input);
    return data;
  },

  update: async (id: string, input: UpdateSeriesInput): Promise<SeriesResponse> => {
    const { data } = await httpClient.patch<SeriesResponse>(`/series/${id}`, input);
    return data;
  },

  pause: async (id: string): Promise<SeriesResponse> => {
    const { data } = await httpClient.post<SeriesResponse>(`/series/${id}/pause`);
    return data;
  },

  resume: async (id: string): Promise<SeriesResponse> => {
    const { data } = await httpClient.post<SeriesResponse>(`/series/${id}/resume`);
    return data;
  },

  end: async (id: string): Promise<SeriesResponse> => {
    const { data } = await httpClient.post<SeriesResponse>(`/series/${id}/end`);
    return data;
  },

  materialize: async (id: string): Promise<void> => {
    await httpClient.post(`/series/${id}/materialize`);
  },

  listEpisodes: async (seriesId: string): Promise<SeriesEpisodeDetail[]> => {
    const { data } = await httpClient.get<SeriesEpisodeDetail[]>(`/series/${seriesId}/episodes`);
    return data;
  },

  reattachEpisode: async (seriesId: string, eventId: string): Promise<SeriesEpisodeDetail> => {
    const { data } = await httpClient.post<SeriesEpisodeDetail>(
      `/series/${seriesId}/episodes/${eventId}/reattach`,
    );
    return data;
  },

  listTicketProducts: async (seriesId: string): Promise<SeriesTicketProduct[]> => {
    const { data } = await httpClient.get<SeriesTicketProduct[]>(
      `/series/${seriesId}/ticket-products`,
    );
    return data;
  },

  createTicketProduct: async (
    seriesId: string,
    input: UpsertSeriesTicketProductInput,
  ): Promise<SeriesTicketProduct> => {
    const { data } = await httpClient.post<SeriesTicketProduct>(
      `/series/${seriesId}/ticket-products`,
      input,
    );
    return data;
  },

  updateTicketProduct: async (
    seriesId: string,
    productId: string,
    input: UpsertSeriesTicketProductInput,
  ): Promise<SeriesTicketProduct> => {
    const { data } = await httpClient.patch<SeriesTicketProduct>(
      `/series/${seriesId}/ticket-products/${productId}`,
      input,
    );
    return data;
  },

  deleteTicketProduct: async (seriesId: string, productId: string): Promise<void> => {
    await httpClient.delete(`/series/${seriesId}/ticket-products/${productId}`);
  },
};
