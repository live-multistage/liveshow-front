import { httpClient } from '@/lib/http/client';
import type {
  PlatformOrganization,
  OrganizationDirectoryResult,
  OrganizationDirectoryFilter,
  PlatformOrganizationMember,
  PlatformOrganizationRole,
  OrgFeatureFlagView,
  PlatformUserResult,
  CreateOrganizationRequest,
  AddOrgMemberRequest,
  OrganizationStatus,
  PlatformRole,
  PlatformOverview,
  PlatformLiveViewers,
  PlatformRevenue,
  OrgBalance,
  StreamHealth,
} from '../types/platform-admin.types';

export const platformAdminService = {
  getOverview: async (range: '7d' | '30d' | '90d' = '30d'): Promise<PlatformOverview> => {
    const { data } = await httpClient.get<PlatformOverview>('/platform-admin/metrics/overview', {
      params: { range },
    });
    return data;
  },

  getLiveViewers: async (): Promise<PlatformLiveViewers> => {
    const { data } = await httpClient.get<PlatformLiveViewers>('/platform-admin/metrics/live-viewers');
    return data;
  },

  getRevenue: async (range: '7d' | '30d' | '90d' = '30d'): Promise<PlatformRevenue> => {
    const { data } = await httpClient.get<PlatformRevenue>('/platform-admin/finance/revenue', {
      params: { range },
    });
    return data;
  },

  getOrgBalances: async (): Promise<OrgBalance[]> => {
    const { data } = await httpClient.get<OrgBalance[]>('/platform-admin/finance/org-balances');
    return data;
  },

  getStreamHealth: async (): Promise<StreamHealth> => {
    const { data } = await httpClient.get<StreamHealth>('/platform-admin/ops/streams');
    return data;
  },

  getPlatformSettings: async (): Promise<{ defaultFeeRate: number }> => {
    const { data } = await httpClient.get<{ defaultFeeRate: number }>('/platform-settings');
    return data;
  },

  setDefaultFeeRate: async (rate: number): Promise<{ defaultFeeRate: number }> => {
    const { data } = await httpClient.put<{ defaultFeeRate: number }>('/platform-settings', { rate });
    return data;
  },

  getGlobalFlags: async (): Promise<Record<string, boolean>> => {
    const { data } = await httpClient.get<Record<string, boolean>>('/feature-flags');
    return data;
  },

  setGlobalFlag: async (key: string, enabled: boolean): Promise<void> => {
    await httpClient.patch(`/feature-flags/${key}`, { enabled });
  },

  listOrganizations: async (filter: OrganizationDirectoryFilter): Promise<OrganizationDirectoryResult> => {
    const { data } = await httpClient.get<OrganizationDirectoryResult>('/platform-admin/organizations', {
      params: { status: filter.status, q: filter.search, page: filter.page, limit: filter.limit },
    });
    return data;
  },

  getOrganization: async (id: string): Promise<PlatformOrganization> => {
    const { data } = await httpClient.get<PlatformOrganization>(`/platform-admin/organizations/${id}`);
    return data;
  },

  getMembers: async (id: string): Promise<PlatformOrganizationMember[]> => {
    const { data } = await httpClient.get<PlatformOrganizationMember[]>(`/platform-admin/organizations/${id}/members`);
    return data;
  },

  createOrganization: async (payload: CreateOrganizationRequest): Promise<PlatformOrganization> => {
    const { data } = await httpClient.post<PlatformOrganization>('/platform-admin/organizations', payload);
    return data;
  },

  approve: async (id: string): Promise<PlatformOrganization> => {
    const { data } = await httpClient.post<PlatformOrganization>(`/platform-admin/organizations/${id}/approve`);
    return data;
  },

  reject: async (id: string, reason: string): Promise<PlatformOrganization> => {
    const { data } = await httpClient.post<PlatformOrganization>(`/platform-admin/organizations/${id}/reject`, { reason });
    return data;
  },

  setStatus: async (id: string, status: OrganizationStatus): Promise<PlatformOrganization> => {
    const { data } = await httpClient.patch<PlatformOrganization>(`/platform-admin/organizations/${id}/status`, { status });
    return data;
  },

  getFlags: async (id: string): Promise<OrgFeatureFlagView[]> => {
    const { data } = await httpClient.get<OrgFeatureFlagView[]>(`/platform-admin/organizations/${id}/flags`);
    return data;
  },

  setFlag: async (id: string, key: string, enabled: boolean): Promise<void> => {
    await httpClient.patch(`/platform-admin/organizations/${id}/flags/${key}`, { enabled });
  },

  searchUsers: async (query: string): Promise<PlatformUserResult[]> => {
    const { data } = await httpClient.get<PlatformUserResult[]>('/platform-admin/users', { params: { q: query } });
    return data;
  },

  changeUserRole: async (userId: string, role: PlatformRole): Promise<void> => {
    await httpClient.put(`/platform-admin/users/${userId}/role`, { role });
  },

  addMember: async (organizationId: string, payload: AddOrgMemberRequest): Promise<PlatformOrganizationMember> => {
    const { data } = await httpClient.post<PlatformOrganizationMember>(
      `/platform-admin/organizations/${organizationId}/members`,
      payload,
    );
    return data;
  },

  changeMemberRole: async (
    organizationId: string,
    memberId: string,
    role: PlatformOrganizationRole,
  ): Promise<PlatformOrganizationMember> => {
    const { data } = await httpClient.put<PlatformOrganizationMember>(
      `/platform-admin/organizations/${organizationId}/members/${memberId}/role`,
      { role },
    );
    return data;
  },
};
