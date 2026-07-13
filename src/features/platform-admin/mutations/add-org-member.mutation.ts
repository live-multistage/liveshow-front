'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { ORGANIZATION_MEMBERS_KEY } from '../queries/get-organization-members';
import type { PlatformOrganizationMember, AddOrgMemberRequest } from '../types/platform-admin.types';

export function useAddOrgMemberMutation(organizationId: string, onSuccess?: (member: PlatformOrganizationMember) => void) {
  const queryClient = useQueryClient();
  return useMutation<PlatformOrganizationMember, AppError, AddOrgMemberRequest>({
    mutationFn: async (payload) => {
      try {
        return await platformAdminService.addMember(organizationId, payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_MEMBERS_KEY(organizationId) });
      onSuccess?.(member);
    },
  });
}
