'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationMembersService } from '../services/organization-members.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { organizationMembersKey } from './use-organization-members';
import type { OrganizationMemberResponse, InviteMemberRequest } from '../types/organization.types';

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrganizationMemberResponse, AppError, InviteMemberRequest>({
    mutationFn: async (payload) => {
      try {
        return await organizationMembersService.inviteMember(orgId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationMembersKey(orgId) });
    },
  });
}
