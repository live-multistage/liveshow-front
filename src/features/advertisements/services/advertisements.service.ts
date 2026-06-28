import { httpClient } from '@/lib/http/client';
import type {
  AdResponse,
  CreateAdRequest,
  UpdateAdRequest,
  ChangeAdStatusRequest,
  AdReportResponse,
} from '../types/advertisement.types';

export const advertisementsService = {
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
};
