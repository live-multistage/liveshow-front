import { httpClient } from '@/lib/http/client';
import type {
  CreateSeriesInput,
  SeriesDetail,
  SeriesEpisode,
  SeriesEpisodeDetail,
  SeriesListItem,
  SeriesOrgResponse,
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

  listByOrg: async (organizationId: string): Promise<SeriesOrgResponse[]> => {
    const { data } = await httpClient.get<SeriesOrgResponse[]>(
      `/organizations/${organizationId}/series`,
    );
    return data;
  },

  create: async (input: CreateSeriesInput): Promise<SeriesOrgResponse> => {
    const { data } = await httpClient.post<SeriesOrgResponse>('/series', input);
    return data;
  },

  update: async (id: string, input: UpdateSeriesInput): Promise<SeriesOrgResponse> => {
    const { data } = await httpClient.patch<SeriesOrgResponse>(`/series/${id}`, input);
    return data;
  },

  pause: async (id: string): Promise<SeriesOrgResponse> => {
    const { data } = await httpClient.post<SeriesOrgResponse>(`/series/${id}/pause`);
    return data;
  },

  resume: async (id: string): Promise<SeriesOrgResponse> => {
    const { data } = await httpClient.post<SeriesOrgResponse>(`/series/${id}/resume`);
    return data;
  },

  end: async (id: string): Promise<SeriesOrgResponse> => {
    const { data } = await httpClient.post<SeriesOrgResponse>(`/series/${id}/end`);
    return data;
  },

  materialize: async (id: string): Promise<void> => {
    await httpClient.post(`/series/${id}/materialize`);
  },

  listEpisodes: async (seriesId: string): Promise<SeriesEpisodeDetail[]> => {
    const { data } = await httpClient.get<SeriesEpisodeDetail[]>(`/series/${seriesId}/episodes`);
    return data;
  },

  // toEpisodeResponse on the backend is called without a hasSales argument
  // for this route, so the response never carries it — SeriesEpisode, not
  // SeriesEpisodeDetail.
  reattachEpisode: async (seriesId: string, eventId: string): Promise<SeriesEpisode> => {
    const { data } = await httpClient.post<SeriesEpisode>(
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
