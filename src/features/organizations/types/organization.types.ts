export type {
  OrganizationRole,
  OrganizationResponse,
  OrganizationEventsFilter,
  OrganizationInvitationStatus,
  OrganizationInvitationResponse,
  InviteOrganizationMemberRequest,
  AcceptOrganizationInvitationResponse,
} from '@live-show/api-contracts';
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

export interface StripeAccountRequirements {
  currentlyDue: string[];
  pastDue: string[];
  disabledReason: string | null;
}

export interface StripeAccountStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  feeRateOverride: number | null;
  effectiveFeeRate: number;
  requirements: StripeAccountRequirements;
}

// Mirrors the orchestrator's LedgerEntryType (payments/domain/ledger-entry.ts).
export type OrganizationLedgerEntryType =
  | 'SALE'
  | 'REFUND'
  | 'PAYOUT'
  | 'CLAWBACK'
  | 'AD_REVENUE'
  | 'DISPUTE'
  | 'ASAAS_SPLIT'
  | 'ASAAS_SPLIT_REVERSAL';

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

// balance = available + pending. Only `available` can be withdrawn now;
// `pending` is sales still inside the settlement hold.
export interface OrganizationLedgerBalance {
  currency: string;
  balance: number;
  available: number;
  pending: number;
}

// PAID_AT_SOURCE sales (Stripe destination / Asaas split) reach the org
// directly and never count in balances; PLATFORM_BALANCE sales do.
export interface OrganizationSale {
  orderId: string;
  paymentId: string;
  soldAt: string;
  currency: string;
  status: 'PAID' | 'REFUNDED';
  provider: string;
  rail: 'PLATFORM_LEDGER' | 'STRIPE_DESTINATION' | 'ASAAS_SPLIT';
  settlement: 'PLATFORM_BALANCE' | 'PAID_AT_SOURCE';
  gross: number;
  fee: number;
  net: number;
  commissionRate: number;
}

export interface OrganizationLedgerResponse {
  balances: OrganizationLedgerBalance[];
  entries: OrganizationLedgerEntry[];
  // Absent on APIs that predate the sales list.
  sales?: OrganizationSale[];
}

// Mirrors PayoutOrganizationLedgerUseCase's return shape
// (live-show-orchestrator payout-organization-ledger.use-case.ts). The
// endpoint pays out every currency the connected account can settle in one
// call — it does not accept a currency parameter.
export interface OrganizationPayoutResult {
  payouts: Array<{ transferId: string; amount: number; currency: string }>;
  failed: Array<{ currency: string; amount: number; error: string }>;
  negativeBalances: Array<{ currency: string; balance: number }>;
  heldCurrencies?: Array<{ currency: string; balance: number }>;
  pendingBalances?: Array<{ currency: string; pending: number }>;
}
