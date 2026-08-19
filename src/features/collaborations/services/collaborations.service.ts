import { httpClient } from '@/lib/http/client';
import type { EventCollaborator, CollaborationInvite, OrganizationSearchResult } from '../types/collaboration.types';

export const collaborationsService = {
  listEventCollaborators: async (eventId: string): Promise<EventCollaborator[]> => {
    const { data } = await httpClient.get<EventCollaborator[]>(`/events/${eventId}/collaborators`);
    return data;
  },

  invite: async (eventId: string, organizationId: string): Promise<EventCollaborator> => {
    const { data } = await httpClient.post<EventCollaborator>(`/events/${eventId}/collaborators`, { organizationId });
    return data;
  },

  cancelInvite: async (eventId: string, collaborationId: string): Promise<void> => {
    await httpClient.delete(`/events/${eventId}/collaborators/${collaborationId}`);
  },

  listOrgInvites: async (orgId: string): Promise<CollaborationInvite[]> => {
    const { data } = await httpClient.get<CollaborationInvite[]>(`/organizations/${orgId}/collaboration-invites`);
    return data;
  },

  accept: async (id: string): Promise<CollaborationInvite> => {
    const { data } = await httpClient.patch<CollaborationInvite>(`/collaborations/${id}/accept`);
    return data;
  },

  decline: async (id: string): Promise<void> => {
    await httpClient.patch(`/collaborations/${id}/decline`);
  },

  searchOrganizations: async (q: string): Promise<OrganizationSearchResult[]> => {
    const { data } = await httpClient.get<{ items: OrganizationSearchResult[] }>('/organizations/search', {
      params: { q },
    });
    return data.items;
  },
};
