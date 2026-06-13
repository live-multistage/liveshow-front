'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationSettingsService } from '../services/organization-settings.service';

export const organizationSettingsKey = (orgId: string) =>
  ['organizations', orgId, 'settings'] as const;

export function useOrganizationSettings(orgId: string) {
  return useQuery({
    queryKey: organizationSettingsKey(orgId),
    queryFn: () => organizationSettingsService.getSettings(orgId),
    enabled: !!orgId,
  });
}
