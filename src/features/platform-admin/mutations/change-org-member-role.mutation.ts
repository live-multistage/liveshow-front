'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { ORGANIZATION_MEMBERS_KEY } from '../queries/get-organization-members';
import type { PlatformOrganizationMember, PlatformOrganizationRole } from '../types/platform-admin.types';

export function useChangeOrgMemberRoleMutation(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation<PlatformOrganizationMember, AppError, { memberId: string; role: PlatformOrganizationRole }>({
    mutationFn: async ({ memberId, role }) => {
      try {
        return await platformAdminService.changeMemberRole(organizationId, memberId, role);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_MEMBERS_KEY(organizationId) });
    },
  });
}
