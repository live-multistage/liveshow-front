export type OrganizationStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'REJECTED';

export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
  status: OrganizationStatus;
  description: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDirectoryResult {
  items: PlatformOrganization[];
  total: number;
  page: number;
  limit: number;
}

export type PlatformOrganizationRole = 'OWNER' | 'ADMIN' | 'CONTENT_MANAGER' | 'OPERATOR';

export interface PlatformOrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  role: PlatformOrganizationRole;
  joinedAt: string;
}

export interface OrgFeatureFlagView {
  key: string;
  enabled: boolean;
  isOverride: boolean;
}

// BROADCASTER is deprecated backend-side (use ARTIST) but legacy rows can still hold it,
// so it stays in the type for safe display; it must never be added to an assignable-role list.
export type PlatformRole = 'USER' | 'ARTIST' | 'ORGANIZER' | 'ADMIN' | 'SUPER_ADMIN' | 'BROADCASTER';

export interface PlatformUserResult {
  id: string;
  email: string;
  displayName: string;
  role: PlatformRole;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
  ownerEmail: string;
}

export interface AddOrgMemberRequest {
  email: string;
  role: PlatformOrganizationRole;
}

export interface OrganizationDirectoryFilter {
  status?: OrganizationStatus;
  search?: string;
  page: number;
  limit: number;
}
