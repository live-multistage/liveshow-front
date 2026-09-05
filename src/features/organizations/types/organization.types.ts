export type { OrganizationRole, OrganizationResponse, OrganizationEventsFilter } from '@live-show/api-contracts';
import type { OrganizationRole } from '@live-show/api-contracts';

// Roles allowed to create events/coupons — mirrors the backend's
// member.isAdmin() (OWNER/ADMIN). Used to filter org selectors in the
// creation flows so a user can't pick an org they'd be 403'd on.
export const ORG_MANAGE_ROLES: OrganizationRole[] = ['OWNER', 'ADMIN'];

export function canManageOrg(role: OrganizationRole | undefined): boolean {
  return role !== undefined && ORG_MANAGE_ROLES.includes(role);
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

export type OrganizerSegment =
  | 'SHOWS_FESTIVALS'
  | 'SPORTS'
  | 'CONFERENCES'
  | 'WORSHIP'
  | 'THEATER_DANCE'
  | 'CLASSES'
  | 'OTHER';

export type OrganizerExperience = 'NEVER' | 'SOME' | 'REGULAR';

export interface CreateOrganizerApplicationRequest {
  organizationName: string;
  socialLink?: string;
  segments: string[];
  experience: OrganizerExperience;
  about: string;
}

export interface OrganizerApplicationResponse {
  id: string;
  status: string;
  organizationName: string;
  socialLink: string | null;
  segments: string[];
  experience: OrganizerExperience;
  about: string;
  createdAt: string;
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
  feeRateOverride: number | null;
  effectiveFeeRate: number;
}

export type OrganizationLedgerEntryType = 'SALE' | 'REFUND' | 'PAYOUT';

export interface OrganizationLedgerEntry {
  id: string;
  organizationId: string;
  type: OrganizationLedgerEntryType;
  amount: number;
  currency: string;
  orderId: string | null;
  paymentId: string | null;
  transferId: string | null;
  gross: number | null;
  buyerFee: number | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  createdAt: string;
}

export interface OrganizationLedgerBalance {
  currency: string;
  balance: number;
}

export interface OrganizationLedgerResponse {
  balances: OrganizationLedgerBalance[];
  entries: OrganizationLedgerEntry[];
}
