'use client';

import { useQuery } from '@tanstack/react-query';
import { organizationService } from '../services/organization.service';

export const ORGANIZATIONS_KEY = ['organizations', 'mine'] as const;
export const organizationKey = (idOrSlug: string) => ['organizations', idOrSlug] as const;
export const organizationEventsKey = (orgId: string, filter: string) =>
  ['organizations', orgId, 'events', filter] as const;

export function useOrganizations() {
  return useQuery({
    queryKey: ORGANIZATIONS_KEY,
    queryFn: organizationService.getMyOrganizations,
  });
}

/** Accepts UUID or slug. */
export function useOrganization(idOrSlug: string) {
  return useQuery({
    queryKey: organizationKey(idOrSlug),
    queryFn: () => organizationService.getByIdOrSlug(idOrSlug),
    enabled: !!idOrSlug,
  });
}

/** @deprecated Use useOrganization — it already handles slugs. */
export const useOrganizationBySlug = useOrganization;

export function useOrganizationEvents(orgId: string, filter: 'upcoming' | 'past' | 'all' = 'all') {
  return useQuery({
    queryKey: organizationEventsKey(orgId, filter),
    queryFn: () => organizationService.getEvents(orgId, filter),
    enabled: !!orgId,
  });
}
