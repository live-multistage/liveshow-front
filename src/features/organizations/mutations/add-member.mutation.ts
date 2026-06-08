'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsService } from '../api/organizations.service';
import { orgMembersKey } from '../queries/get-members';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { OrganizationMemberResponse, AddMemberRequest } from '../types/organization.types';

export function useAddMemberMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation<OrganizationMemberResponse, AppError, AddMemberRequest>({
    mutationFn: async (payload) => {
      try {
        return await organizationsService.addMember(orgId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgMembersKey(orgId) });
    },
  });
}
