'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import { ORG_FEATURE_FLAGS_KEY } from '../queries/get-org-feature-flags';

export function useSetOrgFeatureFlagMutation(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, { key: string; enabled: boolean }>({
    mutationFn: async ({ key, enabled }) => {
      try {
        await platformAdminService.setFlag(organizationId, key, enabled);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_FEATURE_FLAGS_KEY(organizationId) });
    },
  });
}
