import { httpClient } from '@/lib/http/client';
import type {
  OrganizationMemberResponse,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  UserSearchResult,
} from '../types/organization.types';

export const organizationMembersService = {
  getMembers: async (orgId: string): Promise<OrganizationMemberResponse[]> => {
    const { data } = await httpClient.get<OrganizationMemberResponse[]>(
      `/organizations/${orgId}/members`,
    );
    return data;
  },

  inviteMember: async (
    orgId: string,
    payload: InviteMemberRequest,
  ): Promise<OrganizationMemberResponse> => {
    const { data } = await httpClient.post<OrganizationMemberResponse>(
      `/organizations/${orgId}/members/invite`,
      payload,
    );
    return data;
  },

  removeMember: async (orgId: string, memberId: string): Promise<void> => {
    await httpClient.delete(`/organizations/${orgId}/members/${memberId}`);
  },

  updateMemberRole: async (
    orgId: string,
    memberId: string,
    payload: UpdateMemberRoleRequest,
  ): Promise<OrganizationMemberResponse> => {
    const { data } = await httpClient.patch<OrganizationMemberResponse>(
      `/organizations/${orgId}/members/${memberId}/role`,
      payload,
    );
    return data;
  },

  searchUser: async (email: string): Promise<UserSearchResult> => {
    const { data } = await httpClient.get<UserSearchResult>('/auth/users/search', {
      params: { email },
    });
    return data;
  },
};
