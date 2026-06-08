'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationsService } from '../api/organizations.service';

export const MY_ORGANIZATIONS_KEY = ['organizations', 'mine'] as const;

export function useMyOrganizationsQuery() {
  return useQuery({
    queryKey: MY_ORGANIZATIONS_KEY,
    queryFn: organizationsService.getMyOrganizations,
  });
}
