'use client';

import { useQuery } from '@tanstack/react-query';
import { platformAdminService } from '../services/platform-admin.service';
import type { OrganizationDirectoryFilter } from '../types/platform-admin.types';

export const ORGANIZATION_DIRECTORY_KEY = (filter: OrganizationDirectoryFilter) =>
  ['platform-admin', 'organizations', filter] as const;

export function useOrganizationDirectoryQuery(filter: OrganizationDirectoryFilter) {
  return useQuery({
    queryKey: ORGANIZATION_DIRECTORY_KEY(filter),
    queryFn: () => platformAdminService.listOrganizations(filter),
  });
}
