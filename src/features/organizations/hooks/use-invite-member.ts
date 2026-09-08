'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationMembersService } from '../services/organization-members.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { organizationInvitationsKey } from './use-organization-invitations';
import type {
  OrganizationInvitationResponse,
  InviteMemberRequest,
} from '../types/organization.types';

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrganizationInvitationResponse, AppError, InviteMemberRequest>({
    mutationFn: async (payload) => {
      try {
        return await organizationMembersService.inviteMember(orgId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    // Invited people join the members list only on accept, so only the
    // invitations list can have changed here.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationInvitationsKey(orgId) });
    },
  });
}
