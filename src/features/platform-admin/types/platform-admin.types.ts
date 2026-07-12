export type OrganizationStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | 'REJECTED';

export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
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

export type PlatformRole = 'USER' | 'ARTIST' | 'ORGANIZER' | 'ADMIN' | 'SUPER_ADMIN';

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

export interface OrganizationDirectoryFilter {
  status?: OrganizationStatus;
  search?: string;
  page: number;
  limit: number;
}
