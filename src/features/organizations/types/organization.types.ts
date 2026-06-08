export type OrganizationRole = 'OWNER' | 'ADMIN' | 'ORGANIZER' | 'ARTIST' | 'MEMBER';

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMemberResponse {
  id: string;
  organizationId: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  role: OrganizationRole;
  joinedAt: string;
}

export interface UserSearchResult {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
}

export interface AddMemberRequest {
  userId: string;
  role?: OrganizationRole;
}
