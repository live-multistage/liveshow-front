'use client';

import { useMutation } from '@tanstack/react-query';
import { organizationMembersService } from '../services/organization-members.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { AcceptOrganizationInvitationResponse } from '../types/organization.types';

export function useAcceptInvitation() {
  return useMutation<AcceptOrganizationInvitationResponse, AppError, string>({
    mutationFn: async (token) => {
      try {
        return await organizationMembersService.acceptInvitation(token);
      } catch (err) {
        throw normalizeError(err);
      }
    },
  });
}
