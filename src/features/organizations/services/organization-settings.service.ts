import { httpClient } from '@/lib/http/client';
import type {
  OrganizationSettings,
  UpdateOrganizationSettingsRequest,
} from '../types/organization.types';

export const organizationSettingsService = {
  getSettings: async (orgId: string): Promise<OrganizationSettings> => {
    const { data } = await httpClient.get<OrganizationSettings>(
      `/organizations/${orgId}/settings`,
    );
    return data;
  },

  updateSettings: async (
    orgId: string,
    payload: UpdateOrganizationSettingsRequest,
  ): Promise<OrganizationSettings> => {
    const { data } = await httpClient.patch<OrganizationSettings>(
      `/organizations/${orgId}/settings`,
      payload,
    );
    return data;
  },

  uploadLogo: async (orgId: string, file: File): Promise<{ logoUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<{ logoUrl: string }>(
      `/organizations/${orgId}/settings/logo`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  uploadBanner: async (orgId: string, file: File): Promise<{ bannerUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await httpClient.post<{ bannerUrl: string }>(
      `/organizations/${orgId}/settings/banner`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
