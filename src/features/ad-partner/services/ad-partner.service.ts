import { httpClient } from '@/lib/http/client';
import type { AdPartnerDashboard, AdPartnershipRow, AdPartnershipStatus } from '../types/ad-partner.types';

export const adPartnerService = {
  dashboard: async (organizationId: string): Promise<AdPartnerDashboard> => {
    const { data } = await httpClient.get<AdPartnerDashboard>(`/organizations/${organizationId}/ad-partnership`);
    return data;
  },

  apply: async (organizationId: string): Promise<{ id: string; status: AdPartnershipStatus }> => {
    const { data } = await httpClient.post(`/organizations/${organizationId}/ad-partnership/apply`);
    return data as { id: string; status: AdPartnershipStatus };
  },

  list: async (status?: AdPartnershipStatus): Promise<AdPartnershipRow[]> => {
    const { data } = await httpClient.get<AdPartnershipRow[]>('/platform/ad-partnerships', {
      params: status ? { status } : undefined,
    });
    return data;
  },

  review: async (
    id: string,
    action: 'approve' | 'reject' | 'suspend' | 'reinstate',
    note?: string,
  ): Promise<AdPartnershipRow> => {
    const { data } = await httpClient.post<AdPartnershipRow>(
      `/platform/ad-partnerships/${id}/${action}`,
      note ? { note } : undefined,
    );
    return data;
  },

  setRate: async (id: string, rate: number | null): Promise<AdPartnershipRow> => {
    const { data } = await httpClient.patch<AdPartnershipRow>(`/platform/ad-partnerships/${id}/rate`, { rate });
    return data;
  },
};
