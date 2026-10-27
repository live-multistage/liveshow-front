export type OrganizationRole = 'OWNER' | 'ADMIN' | 'EVENT_MANAGER' | 'CONTENT_MANAGER' | 'OPERATOR' | 'STAFF' | 'VIEWER';

export type OrganizationStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'REJECTED';

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  ownerId: string;
  status: OrganizationStatus;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  // Present only on /organizations/mine — the caller's role in this org.
  role?: OrganizationRole;
  // Present only on /organizations/mine — dashboard aggregates.
  activeEventsCount?: number;
  memberCount?: number;
  salesThisMonth?: { currency: string; amount: number }[];
}

// GET /organizations/mine/paged + /organizations/mine/summary — the organizer
// dashboard list. owned = the caller owns it; invited = a member of someone
// else's org (not a pending invitation); archived = status ARCHIVED.
// Omitted filter = every organization, archived ones included.
export type MyOrganizationsFilter = 'owned' | 'invited' | 'archived';

export interface MyOrganizationsPageParams {
  filter?: MyOrganizationsFilter;
  // Case-insensitive match on name, slug or description; ANDed with filter.
  q?: string;
  page?: number;
  pageSize?: number;
}

// Same item as /organizations/mine, so role and the stats are always present.
export type MyOrganizationResponse = OrganizationResponse &
  Required<Pick<OrganizationResponse, 'role' | 'activeEventsCount' | 'memberCount' | 'salesThisMonth'>>;

// Ordered by name, then id.
export interface MyOrganizationsPageResponse {
  items: MyOrganizationResponse[];
  page: number;
  pageSize: number;
  total: number;
}

// Over every organization of the caller, ignoring filter and q.
export interface MyOrganizationsSummary {
  counts: Record<'all' | MyOrganizationsFilter, number>;
  totals: {
    activeEventsCount: number;
    memberCount: number;
    salesThisMonth: { currency: string; amount: number }[];
  };
}

export type OrganizationEventsFilter = 'upcoming' | 'past' | 'all';

// ── Member invitations ────────────────────────────────────────────────────
// Membership is granted only when the invitee accepts, so POST
// :id/members/invite answers with an invitation, never a member.

export type OrganizationInvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'REVOKED';

export interface InviteOrganizationMemberRequest {
  email: string;
  role?: OrganizationRole;
}

export interface OrganizationInvitationResponse {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  status: OrganizationInvitationStatus;
  invitedByUserId: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface AcceptOrganizationInvitationResponse {
  invitation: OrganizationInvitationResponse;
  member: {
    id: string;
    organizationId: string;
    userId: string;
    email: string | null;
    displayName: string | null;
    role: OrganizationRole;
    joinedAt: string;
  };
}
