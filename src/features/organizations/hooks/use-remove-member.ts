'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationMembersService } from '../services/organization-members.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { organizationMembersKey } from './use-organization-members';

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, AppError, string>({
    mutationFn: async (memberId) => {
      try {
        await organizationMembersService.removeMember(orgId, memberId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationMembersKey(orgId) });
    },
  });
}
