import { httpClient } from '@/lib/http/client';
import type {
  AdResponse,
  CreateAdRequest,
  UpdateAdRequest,
  ChangeAdStatusRequest,
  AdReportResponse,
  ServedAd,
  AdPlacement,
} from '../types/advertisement.types';

export const advertisementsService = {
  getOne: async (id: string): Promise<AdResponse> => {
    const { data } = await httpClient.get<AdResponse>(`/ads/${id}`);
    return data;
  },

  list: async (orgId: string): Promise<AdResponse[]> => {
    const { data } = await httpClient.get<AdResponse[]>('/ads', { params: { orgId } });
    return data;
  },

  create: async (payload: CreateAdRequest): Promise<AdResponse> => {
    const { data } = await httpClient.post<AdResponse>('/ads', payload);
    return data;
  },

  update: async (id: string, payload: UpdateAdRequest): Promise<void> => {
    await httpClient.patch(`/ads/${id}`, payload);
  },

  changeStatus: async (id: string, payload: ChangeAdStatusRequest): Promise<void> => {
    await httpClient.patch(`/ads/${id}/status`, payload);
  },

  getReport: async (id: string): Promise<AdReportResponse> => {
    const { data } = await httpClient.get<AdReportResponse>(`/ads/${id}/report`);
    return data;
  },

  serve: async (placement: AdPlacement, limit = 1): Promise<ServedAd[]> => {
    const { data } = await httpClient.get<ServedAd[]>('/ads/serve', { params: { placement, limit } });
    return data;
  },

  recordImpression: (adId: string): void => {
    httpClient.post(`/ads/serve/${adId}/impression`).catch(() => {});
  },

  recordClick: (adId: string): void => {
    httpClient.post(`/ads/serve/${adId}/click`).catch(() => {});
  },

  uploadBanner: async (id: string, file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<{ bannerUrl: string }>(`/ads/${id}/banner`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.bannerUrl;
  },
};
