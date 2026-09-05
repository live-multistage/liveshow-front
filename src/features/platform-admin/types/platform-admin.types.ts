import type { AdDestination } from '@/features/advertisements/types/advertisement.types';
import type { ReportReason } from '@/features/reports/types/report.types';

export type { AdDestination, ReportReason };

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

// Super Admin global overview (GET /platform-admin/metrics/overview).
export interface CurrencyFinancials {
  currency: string;
  gmv: number;
  platformRevenue: number;
}

export interface PlatformOverview {
  orgs: { total: number; active: number; pending: number };
  users: { total: number; newInRange: number };
  events: { total: number; scheduled: number; live: number };
  liveEvents: number;
  // No FX conversion — one entry per currency, never summed across currencies.
  financials: CurrencyFinancials[];
  rangeDays: number;
}

// Realtime viewers (GET /platform-admin/metrics/live-viewers).
export interface PlatformLiveViewers {
  totalNow: number;
  perMinutePct: number;
  series: number[];
  topEvents: { eventId: string; title: string; viewers: number }[];
}

// Platform revenue (GET /platform-admin/finance/revenue). No FX — one block
// per currency.
export interface CurrencyRevenue {
  currency: string;
  revenue: number;
  revenueDeltaPct: number;
  gmv: number;
  avgRate: number;
  avgTicket: number;
  series: { date: string; revenue: number }[];
}

export interface PlatformRevenue {
  rangeDays: number;
  byCurrency: CurrencyRevenue[];
}

// Org ledger balances (GET /platform-admin/finance/org-balances).
export interface OrgBalance {
  orgId: string;
  name: string;
  currency: string;
  balance: number;
  rate: number;
  override: boolean;
}

// Stream health (GET /platform-admin/ops/streams).
export interface StreamHealthJob {
  id: string;
  cameraName: string;
  eventTitle: string;
  status: string; // RUNNING | FAILED | RETRYING
  error: string | null;
  startedAt: string | null;
  endedAt: string | null;
  renditions: number;
}

export interface StreamHealthIngest {
  id: string;
  cameraName: string;
  eventTitle: string;
  remoteAddr: string | null;
  startedAt: string | null;
}

export interface StreamHealth {
  liveEvents: number;
  transcodeActive: number;
  transcodeFailed: number; // last 24h
  ingestConnected: number;
  activeJobs: StreamHealthJob[];
  failedJobs: StreamHealthJob[];
  ingestSessions: StreamHealthIngest[];
}

// Catalog summary (GET /platform-admin/catalog/summary).
export interface CatalogSummary {
  events: { total: number; published: number; live: number };
  ads: { active: number; review: number; impressions30d: number };
  coupons: { active: number; expiring7d: number; redemptions30d: number };
}

// Read-only impersonation session (POST /platform-admin/impersonation).
export interface ImpersonationSession {
  token: string;
  jti: string;
  expiresAt: string;
  readOnly: true;
  target: { id: string; email: string; displayName: string; role: PlatformRole };
}

// Audit trail entry (GET /platform-admin/audit).
export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// Filtered + paginated audit read (GET /platform-admin/audit/search).
export interface AuditSearchResult {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

// Revenue breakdown per org (GET /platform-admin/finance/revenue/breakdown).
export interface RevenueBreakdownRow {
  orgId: string;
  name: string;
  currency: string;
  commission: number;
  gmv: number;
  sales: number;
  sharePct: number;
}

interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Global event directory (GET /platform-admin/events).
export interface PlatformEventRow {
  id: string;
  title: string;
  orgId: string;
  orgName: string;
  status: string;
  startsAt: string;
  camerasCount: number;
  category: string;
  thumbnailUrl: string | null;
  publiclyFunded: boolean;
  hasLibrasCamera: boolean;
  accessibilityApproved: boolean;
  moderationStatus: 'APPROVED' | 'REJECTED' | null;
  moderationReason: string | null;
  openReportsCount: number;
}
export type PlatformEventsResult = Paged<PlatformEventRow>;

export type EventModerationAction = 'PUBLISH' | 'UNPUBLISH' | 'CANCEL' | 'APPROVE' | 'REJECT';

// Report review (GET /platform-admin/reports, POST /platform-admin/reports/:id/resolve).
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED';
export interface PlatformReport {
  id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  createdAt: string;
  reporterKind: 'user' | 'anonymous';
}
export type PlatformReportsResult = Paged<PlatformReport>;

// Global ad directory (GET /platform-admin/ads).
export interface PlatformAdRow {
  id: string;
  name: string;
  orgId: string;
  orgName: string;
  status: string;
  placements: string;
  bannerUrl: string | null;
  spend: number;
  impressions30d: number;
  startsAt: string;
  endsAt: string;
}
export type PlatformAdsResult = Paged<PlatformAdRow>;

// Full ad + review history (GET /platform-admin/ads/:id).
export interface AdReviewRecord {
  id: string;
  adId: string;
  reviewerType: string;
  outcome: 'APPROVE' | 'REJECT' | 'PENDING' | 'SUBMITTED';
  reason: string | null;
  reviewedBy: string;
  createdAt: string;
}
export interface AdDetail {
  ad: {
    id: string;
    advertiserAccountId: string;
    /** null = legacy ad predating destinations. */
    destination: AdDestination | null;
    title: string;
    format: string;
    status: string;
    placements: string[];
    targetDomains: string[];
    targetCategories: string[];
    bannerUrl: string | null;
    frequencyCapMax: number | null;
    frequencyCapWindow: string | null;
    billingModel: string;
    bidCents: number;
    dailyBudgetCents: number;
    totalLimitCents: number;
    totalSpendCents: number;
    startsAt: string;
    endsAt: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
  reviews: AdReviewRecord[];
}

// Active review strategy (GET/PATCH /platform-admin/ad-review/config).
export interface AdReviewConfig {
  strategy: string;
  strategies: string[];
}

// Organizer applications (GET /platform-admin/organizer-applications).
export type OrganizerApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type OrganizerApplicationExperience = 'NEVER' | 'SOME' | 'REGULAR';

export interface OrganizerApplicationAdmin {
  id: string;
  userId: string;
  organizationName: string;
  socialLink: string | null;
  segments: string[];
  experience: OrganizerApplicationExperience;
  about: string;
  spamScore: number; // 0..100, higher = more suspicious
  reviewFlags: string[];
  status: OrganizerApplicationStatus;
  rejectionReason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Global coupon directory (GET /platform-admin/coupons).
export interface PlatformCouponRow {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  scope: 'global' | 'org' | 'event';
  usesCount: number;
  maxUses: number | null;
  expiresAt: string | null;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXHAUSTED';
}
export type PlatformCouponsResult = Paged<PlatformCouponRow>;
