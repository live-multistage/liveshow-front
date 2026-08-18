import type { EventOrganization } from '@/features/events/types/event.types';

export interface EventCollaborator {
  id: string;
  organization: EventOrganization;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
}

export interface CollaborationInvite {
  id: string;
  event: {
    id: string;
    title: string;
  };
  ownerOrganization: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  createdAt: string;
}

export interface OrganizationSearchResult {
  id: string;
  name: string;
  logoUrl: string | null;
}
