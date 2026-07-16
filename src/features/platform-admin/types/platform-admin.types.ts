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
export interface PlatformOverview {
  orgs: { total: number; active: number; pending: number };
  users: { total: number; newInRange: number };
  events: { total: number; scheduled: number; live: number };
  liveEvents: number;
  gmv: number;
  platformRevenue: number;
  rangeDays: number;
}

// Realtime viewers (GET /platform-admin/metrics/live-viewers).
export interface PlatformLiveViewers {
  totalNow: number;
  perMinutePct: number;
  series: number[];
  topEvents: { eventId: string; title: string; viewers: number }[];
}

// Platform revenue (GET /platform-admin/finance/revenue).
export interface PlatformRevenue {
  revenue: number;
  revenueDeltaPct: number;
  gmv: number;
  avgRate: number;
  avgTicket: number;
  series: { date: string; revenue: number }[];
  rangeDays: number;
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
export interface StreamHealth {
  liveEvents: number;
  transcodeActive: number;
  transcodeFailed: number;
  ingestConnected: number;
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
  expiresAt: string;
  readOnly: true;
  target: { id: string; email: string; displayName: string };
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
