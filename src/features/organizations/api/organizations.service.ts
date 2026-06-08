import { httpClient } from '@/lib/http/client';
import type {
  OrganizationResponse,
  OrganizationMemberResponse,
  CreateOrganizationRequest,
  AddMemberRequest,
  UserSearchResult,
} from '../types/organization.types';

export const organizationsService = {
  getMyOrganizations: async (): Promise<OrganizationResponse[]> => {
    const { data } = await httpClient.get<OrganizationResponse[]>('/organizations/mine');
    return data;
  },

  getById: async (id: string): Promise<OrganizationResponse> => {
    const { data } = await httpClient.get<OrganizationResponse>(`/organizations/${id}`);
    return data;
  },

  create: async (payload: CreateOrganizationRequest): Promise<OrganizationResponse> => {
    const { data } = await httpClient.post<OrganizationResponse>('/organizations', payload);
    return data;
  },

  getMembers: async (orgId: string): Promise<OrganizationMemberResponse[]> => {
    const { data } = await httpClient.get<OrganizationMemberResponse[]>(
      `/organizations/${orgId}/members`,
    );
    return data;
  },

  addMember: async (orgId: string, payload: AddMemberRequest): Promise<OrganizationMemberResponse> => {
    const { data } = await httpClient.post<OrganizationMemberResponse>(
      `/organizations/${orgId}/members`,
      payload,
    );
    return data;
  },

  removeMember: async (orgId: string, userId: string): Promise<void> => {
    await httpClient.delete(`/organizations/${orgId}/members/${userId}`);
  },

  searchUser: async (email: string): Promise<UserSearchResult> => {
    const { data } = await httpClient.get<UserSearchResult>('/auth/users/search', {
      params: { email },
    });
    return data;
  },
};
