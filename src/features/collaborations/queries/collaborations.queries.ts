'use client';

import { useQuery } from '@tanstack/react-query';
import { collaborationsService } from '../services/collaborations.service';

export const collaborationsKeys = {
  all: ['collaborations'] as const,
  eventCollaborators: (eventId: string) => ['collaborations', 'event', eventId] as const,
  orgInvites: (orgId: string) => ['collaborations', 'org-invites', orgId] as const,
  organizationSearch: (q: string) => ['collaborations', 'org-search', q] as const,
};

export function useEventCollaboratorsQuery(eventId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: collaborationsKeys.eventCollaborators(eventId),
    queryFn: () => collaborationsService.listEventCollaborators(eventId),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useOrgCollaborationInvitesQuery(orgId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: collaborationsKeys.orgInvites(orgId),
    queryFn: () => collaborationsService.listOrgInvites(orgId),
    enabled: options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useOrganizationSearchQuery(q: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: collaborationsKeys.organizationSearch(q),
    queryFn: () => collaborationsService.searchOrganizations(q),
    enabled: options?.enabled !== false && q.length > 0,
    staleTime: 60_000,
  });
}
