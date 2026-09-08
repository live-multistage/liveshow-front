import { httpClient } from '@/lib/http/client';
import type {
  OrganizationMemberResponse,
  OrganizationInvitationResponse,
  AcceptOrganizationInvitationResponse,
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

  // Membership is only granted when the invitee accepts, so this answers with
  // a PENDING invitation — the invited person does NOT show up in getMembers()
  // until then; they show up in listInvitations().
  inviteMember: async (
    orgId: string,
    payload: InviteMemberRequest,
  ): Promise<OrganizationInvitationResponse> => {
    const { data } = await httpClient.post<OrganizationInvitationResponse>(
      `/organizations/${orgId}/members/invite`,
      payload,
    );
    return data;
  },

  listInvitations: async (orgId: string): Promise<OrganizationInvitationResponse[]> => {
    const { data } = await httpClient.get<OrganizationInvitationResponse[]>(
      `/organizations/${orgId}/invitations`,
    );
    return data;
  },

  revokeInvitation: async (orgId: string, invitationId: string): Promise<void> => {
    await httpClient.delete(`/organizations/${orgId}/invitations/${invitationId}`);
  },

  acceptInvitation: async (token: string): Promise<AcceptOrganizationInvitationResponse> => {
    const { data } = await httpClient.post<AcceptOrganizationInvitationResponse>(
      `/organizations/invitations/${encodeURIComponent(token)}/accept`,
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
