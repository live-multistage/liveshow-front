'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationMembersService } from '../services/organization-members.service';
import { normalizeError, type AppError } from '@/lib/http/errors';

export const organizationInvitationsKey = (orgId: string) =>
  ['organizations', orgId, 'invitations'] as const;

export function useOrganizationInvitations(orgId: string, enabled = true) {
  return useQuery({
    queryKey: organizationInvitationsKey(orgId),
    queryFn: () => organizationMembersService.listInvitations(orgId),
    enabled: !!orgId && enabled,
  });
}

export function useRevokeInvitation(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, string>({
    mutationFn: async (invitationId) => {
      try {
        await organizationMembersService.revokeInvitation(orgId, invitationId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationInvitationsKey(orgId) });
    },
  });
}
