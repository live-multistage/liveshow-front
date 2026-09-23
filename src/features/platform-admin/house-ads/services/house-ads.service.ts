import { httpClient } from '@/lib/http/client';
import type {
  CreateHouseAdRequest,
  CreateHouseAdResponse,
  HouseAdDetail,
  HouseAdListFilter,
  HouseAdListResult,
  HouseAdReport,
  HouseAdStatusAction,
  UpdateHouseAdRequest,
  UploadHouseAdBannerResponse,
  UploadHouseAdVideoResponse,
} from '../types/house-ads.types';

const BASE = '/platform-admin/house-ads';

export const houseAdsService = {
  list: async (filter: HouseAdListFilter): Promise<HouseAdListResult> => {
    const { data } = await httpClient.get<HouseAdListResult>(BASE, {
      params: { status: filter.status, priority: filter.priority, page: filter.page, limit: filter.limit },
    });
    return data;
  },

  getDetail: async (id: string): Promise<HouseAdDetail> => {
    const { data } = await httpClient.get<HouseAdDetail>(`${BASE}/${id}`);
    return data;
  },

  create: async (payload: CreateHouseAdRequest): Promise<CreateHouseAdResponse> => {
    const { data } = await httpClient.post<CreateHouseAdResponse>(BASE, payload);
    return data;
  },

  update: async (id: string, payload: UpdateHouseAdRequest): Promise<{ ok: true }> => {
    const { data } = await httpClient.patch<{ ok: true }>(`${BASE}/${id}`, payload);
    return data;
  },

  uploadBanner: async (id: string, file: File): Promise<UploadHouseAdBannerResponse> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<UploadHouseAdBannerResponse>(`${BASE}/${id}/banner`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadVideo: async (id: string, file: File): Promise<UploadHouseAdVideoResponse> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<UploadHouseAdVideoResponse>(`${BASE}/${id}/video`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  changeStatus: async (id: string, action: HouseAdStatusAction): Promise<{ ok: true }> => {
    const { data } = await httpClient.post<{ ok: true }>(`${BASE}/${id}/${action}`);
    return data;
  },

  getReport: async (id: string): Promise<HouseAdReport> => {
    const { data } = await httpClient.get<HouseAdReport>(`${BASE}/${id}/report`);
    return data;
  },
};
