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
