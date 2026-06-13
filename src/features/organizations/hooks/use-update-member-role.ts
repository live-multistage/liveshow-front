'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationMembersService } from '../services/organization-members.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { organizationMembersKey } from './use-organization-members';
import type { OrganizationMemberResponse, OrganizationRole } from '../types/organization.types';

interface UpdateRolePayload {
  memberId: string;
  role: OrganizationRole;
}

export function useUpdateMemberRole(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation<OrganizationMemberResponse, AppError, UpdateRolePayload>({
    mutationFn: async ({ memberId, role }) => {
      try {
        return await organizationMembersService.updateMemberRole(orgId, memberId, { role });
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationMembersKey(orgId) });
    },
  });
}
