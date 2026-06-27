export type OrganizationRole = 'OWNER' | 'ADMIN' | 'EVENT_MANAGER' | 'CONTENT_MANAGER' | 'OPERATOR' | 'VIEWER';

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
}

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  logoUrl?: string;
  bannerUrl?: string;
  email?: string;
  supportEmail?: string;
  phone?: string;
  legalName?: string;
  documentNumber?: string;
  country?: string;
  state?: string;
  city?: string;
  timezone?: string;
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
  description?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  description?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: OrganizationRole;
}

export interface UpdateMemberRoleRequest {
  role: OrganizationRole;
}

/** @deprecated Use InviteMemberRequest instead */
export interface AddMemberRequest {
  userId: string;
  role?: OrganizationRole;
}

export interface UpdateOrganizationSettingsRequest {
  email?: string;
  supportEmail?: string;
  phone?: string;
  legalName?: string;
  documentNumber?: string;
  country?: string;
  state?: string;
  city?: string;
  timezone?: string;
}

export interface StripeAccountStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  platformFeeRate: number;
}
