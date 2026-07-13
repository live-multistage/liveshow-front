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
} from '../types/platform-admin.types';

export const platformAdminService = {
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
