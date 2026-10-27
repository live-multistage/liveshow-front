'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';
import { ORGANIZATIONS_KEY } from './use-organizations';
import type { MyOrganizationsPageParams } from '../types/organization.types';

// Both keys live under ORGANIZATIONS_KEY so the create/update mutations, which
// invalidate that prefix, refresh the paged list and its summary too.
export const MY_ORGANIZATIONS_PAGE_KEY = (params: MyOrganizationsPageParams) => [...ORGANIZATIONS_KEY, 'page', params];
export const MY_ORGANIZATIONS_SUMMARY_KEY = [...ORGANIZATIONS_KEY, 'summary'];

export function useMyOrganizationsPageQuery(params: MyOrganizationsPageParams) {
  return useQuery({
    queryKey: MY_ORGANIZATIONS_PAGE_KEY(params),
    queryFn: () => organizationService.listMyOrganizations(params),
    placeholderData: keepPreviousData,
  });
}

export function useMyOrganizationsSummaryQuery() {
  return useQuery({
    queryKey: MY_ORGANIZATIONS_SUMMARY_KEY,
    queryFn: organizationService.getMyOrganizationsSummary,
  });
}
