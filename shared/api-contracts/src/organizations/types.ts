export type OrganizationRole = 'OWNER' | 'ADMIN' | 'EVENT_MANAGER' | 'CONTENT_MANAGER' | 'OPERATOR' | 'STAFF' | 'VIEWER';

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  // Present only on /organizations/mine — the caller's role in this org.
  role?: OrganizationRole;
  // Present only on /organizations/mine — dashboard aggregates.
  activeEventsCount?: number;
  memberCount?: number;
  salesThisMonth?: { currency: string; amount: number }[];
}

export type OrganizationEventsFilter = 'upcoming' | 'past' | 'all';
