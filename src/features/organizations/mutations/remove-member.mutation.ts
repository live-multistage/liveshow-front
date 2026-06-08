'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationsService } from '../api/organizations.service';
import { orgMembersKey } from '../queries/get-members';
import { normalizeError, type AppError } from '@/lib/http/errors';

export function useRemoveMemberMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, string>({
    mutationFn: async (userId) => {
      try {
        await organizationsService.removeMember(orgId, userId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgMembersKey(orgId) });
    },
  });
}
