import { httpClient } from '@/lib/http/client';
import type {
  PlatformOrganization,
  OrganizationDirectoryResult,
  OrganizationDirectoryFilter,
  PlatformOrganizationMember,
  PlatformOrganizationRole,
  OrgFeatureFlagView,
  PlatformUserResult,
  CreateOrganizationRequest,
  AddOrgMemberRequest,
  OrganizationStatus,
  PlatformRole,
  PlatformOverview,
  PlatformLiveViewers,
  PlatformRevenue,
  OrgBalance,
  StreamHealth,
  CatalogSummary,
  AuditLogEntry,
  AuditSearchResult,
  ImpersonationSession,
  RevenueBreakdownRow,
  PlatformEventsResult,
  PlatformAdsResult,
  PlatformCouponsResult,
  AdDetail,
  AdReviewConfig,
  EventModerationAction,
  PlatformReportsResult,
  ReportStatus,
} from '../types/platform-admin.types';

export const platformAdminService = {
  getOverview: async (range: '7d' | '30d' | '90d' = '30d'): Promise<PlatformOverview> => {
    const { data } = await httpClient.get<PlatformOverview>('/platform-admin/metrics/overview', {
      params: { range },
    });
    return data;
  },

  getLiveViewers: async (): Promise<PlatformLiveViewers> => {
    const { data } = await httpClient.get<PlatformLiveViewers>('/platform-admin/metrics/live-viewers');
    return data;
  },

  getRevenue: async (range: '7d' | '30d' | '90d' = '30d'): Promise<PlatformRevenue> => {
    const { data } = await httpClient.get<PlatformRevenue>('/platform-admin/finance/revenue', {
      params: { range },
    });
    return data;
  },

  getOrgBalances: async (): Promise<OrgBalance[]> => {
    const { data } = await httpClient.get<OrgBalance[]>('/platform-admin/finance/org-balances');
    return data;
  },

  getStreamHealth: async (): Promise<StreamHealth> => {
    const { data } = await httpClient.get<StreamHealth>('/platform-admin/ops/streams');
    return data;
  },

  getPlatformSettings: async (): Promise<{ defaultFeeRate: number }> => {
    const { data } = await httpClient.get<{ defaultFeeRate: number }>('/platform-settings');
    return data;
  },

  setDefaultFeeRate: async (rate: number): Promise<{ defaultFeeRate: number }> => {
    const { data } = await httpClient.patch<{ defaultFeeRate: number }>('/platform-settings/default-fee-rate', { rate });
    return data;
  },

  getGlobalFlags: async (): Promise<Record<string, boolean>> => {
    const { data } = await httpClient.get<Record<string, boolean>>('/feature-flags');
    return data;
  },

  setGlobalFlag: async (key: string, enabled: boolean): Promise<void> => {
    await httpClient.patch(`/feature-flags/${key}`, { enabled });
  },

  getCatalogSummary: async (): Promise<CatalogSummary> => {
    const { data } = await httpClient.get<CatalogSummary>('/platform-admin/catalog/summary');
    return data;
  },

  getAuditLog: async (limit = 20): Promise<AuditLogEntry[]> => {
    const { data } = await httpClient.get<AuditLogEntry[]>('/platform-admin/audit', { params: { limit } });
    return data;
  },

  searchAuditLog: async (params: {
    page?: number;
    limit?: number;
    action?: string;
    actorId?: string;
    from?: string;
    to?: string;
  }): Promise<AuditSearchResult> => {
    const { data } = await httpClient.get<AuditSearchResult>('/platform-admin/audit/search', { params });
    return data;
  },

  // Fee override per org (rate as decimal, e.g. 0.035; null clears the override).
  setOrgFeeOverride: async (orgId: string, rate: number | null): Promise<{ orgId: string; rate: number | null }> => {
    const { data } = await httpClient.patch<{ orgId: string; rate: number | null }>(
      `/organizations/${orgId}/stripe/fee-rate`,
      { rate },
    );
    return data;
  },

  payoutOrg: async (orgId: string): Promise<unknown> => {
    const { data } = await httpClient.post(`/admin/organizations/${orgId}/ledger/payout`);
    return data;
  },

  // Read-only impersonation. START must run with the admin's real token; the
  // returned token is read-only (backend-enforced). END must also run with the
  // admin token — restore it before calling (see the banner).
  startImpersonation: async (targetUserId: string): Promise<ImpersonationSession> => {
    const { data } = await httpClient.post<ImpersonationSession>('/platform-admin/impersonation', {
      targetUserId,
    });
    return data;
  },

  endImpersonation: async (targetUserId: string, jti?: string): Promise<void> => {
    await httpClient.post('/platform-admin/impersonation/end', { targetUserId, jti });
  },

  getRevenueBreakdown: async (range: '7d' | '30d' | '90d' = '30d'): Promise<RevenueBreakdownRow[]> => {
    const { data } = await httpClient.get<RevenueBreakdownRow[]>('/platform-admin/finance/revenue/breakdown', {
      params: { range },
    });
    return data;
  },

  getPlatformEvents: async (params: { status?: string; moderation?: string; q?: string; page?: number }): Promise<PlatformEventsResult> => {
    const { data } = await httpClient.get<PlatformEventsResult>('/platform-admin/events', { params });
    return data;
  },
  moderateEvent: async (id: string, action: EventModerationAction, reason?: string): Promise<void> => {
    await httpClient.post(`/platform-admin/events/${id}/moderation`, { action, reason });
  },

  getEventReports: async (
    eventId: string,
    status?: ReportStatus,
    page?: number,
    limit?: number,
  ): Promise<PlatformReportsResult> => {
    const { data } = await httpClient.get<PlatformReportsResult>('/platform-admin/reports', {
      params: { targetId: eventId, status, page, limit },
    });
    return data;
  },
  resolveReport: async (id: string, status: 'REVIEWED' | 'DISMISSED'): Promise<{ id: string; status: ReportStatus; resolvedBy: string; resolvedAt: string }> => {
    const { data } = await httpClient.post<{ id: string; status: ReportStatus; resolvedBy: string; resolvedAt: string }>(
      `/platform-admin/reports/${id}/resolve`,
      { status },
    );
    return data;
  },

  getPlatformAds: async (params: { status?: string; page?: number }): Promise<PlatformAdsResult> => {
    const { data } = await httpClient.get<PlatformAdsResult>('/platform-admin/ads', { params });
    return data;
  },
  getAdDetail: async (id: string): Promise<AdDetail> => {
    const { data } = await httpClient.get<AdDetail>(`/platform-admin/ads/${id}`);
    return data;
  },
  reviewAd: async (id: string, decision: 'APPROVE' | 'REJECT', reason?: string): Promise<void> => {
    await httpClient.post(`/platform-admin/ads/${id}/review`, { decision, reason });
  },
  pauseAd: async (id: string): Promise<void> => {
    await httpClient.post(`/platform-admin/ads/${id}/pause`);
  },
  resumeAd: async (id: string): Promise<void> => {
    await httpClient.post(`/platform-admin/ads/${id}/resume`);
  },
  getAdReviewConfig: async (): Promise<AdReviewConfig> => {
    const { data } = await httpClient.get<AdReviewConfig>('/platform-admin/ad-review/config');
    return data;
  },
  setAdReviewStrategy: async (strategy: string): Promise<{ strategy: string }> => {
    const { data } = await httpClient.patch<{ strategy: string }>('/platform-admin/ad-review/config', { strategy });
    return data;
  },

  getPlatformCoupons: async (params: { status?: string; q?: string; page?: number }): Promise<PlatformCouponsResult> => {
    const { data } = await httpClient.get<PlatformCouponsResult>('/platform-admin/coupons', { params });
    return data;
  },
  deactivateCoupon: async (id: string): Promise<void> => {
    await httpClient.patch(`/platform-admin/coupons/${id}/deactivate`);
  },

  listOrganizations: async (filter: OrganizationDirectoryFilter): Promise<OrganizationDirectoryResult> => {
    const { data } = await httpClient.get<OrganizationDirectoryResult>('/platform-admin/organizations', {
      params: { status: filter.status, q: filter.search, page: filter.page, limit: filter.limit },
    });
    return data;
  },

  getOrganization: async (id: string): Promise<PlatformOrganization> => {
    const { data } = await httpClient.get<PlatformOrganization>(`/platform-admin/organizations/${id}`);
    return data;
  },

  getMembers: async (id: string): Promise<PlatformOrganizationMember[]> => {
    const { data } = await httpClient.get<PlatformOrganizationMember[]>(`/platform-admin/organizations/${id}/members`);
    return data;
  },

  createOrganization: async (payload: CreateOrganizationRequest): Promise<PlatformOrganization> => {
    const { data } = await httpClient.post<PlatformOrganization>('/platform-admin/organizations', payload);
    return data;
  },

  approve: async (id: string): Promise<PlatformOrganization> => {
    const { data } = await httpClient.post<PlatformOrganization>(`/platform-admin/organizations/${id}/approve`);
    return data;
  },

  reject: async (id: string, reason: string): Promise<PlatformOrganization> => {
    const { data } = await httpClient.post<PlatformOrganization>(`/platform-admin/organizations/${id}/reject`, { reason });
    return data;
  },

  setStatus: async (id: string, status: OrganizationStatus): Promise<PlatformOrganization> => {
    const { data } = await httpClient.patch<PlatformOrganization>(`/platform-admin/organizations/${id}/status`, { status });
    return data;
  },

  getFlags: async (id: string): Promise<OrgFeatureFlagView[]> => {
    const { data } = await httpClient.get<OrgFeatureFlagView[]>(`/platform-admin/organizations/${id}/flags`);
    return data;
  },

  setFlag: async (id: string, key: string, enabled: boolean): Promise<void> => {
    await httpClient.patch(`/platform-admin/organizations/${id}/flags/${key}`, { enabled });
  },

  searchUsers: async (query: string): Promise<PlatformUserResult[]> => {
    const { data } = await httpClient.get<PlatformUserResult[]>('/platform-admin/users', { params: { q: query } });
    return data;
  },

  changeUserRole: async (userId: string, role: PlatformRole): Promise<void> => {
    await httpClient.put(`/platform-admin/users/${userId}/role`, { role });
  },

  addMember: async (organizationId: string, payload: AddOrgMemberRequest): Promise<PlatformOrganizationMember> => {
    const { data } = await httpClient.post<PlatformOrganizationMember>(
      `/platform-admin/organizations/${organizationId}/members`,
      payload,
    );
    return data;
  },

  changeMemberRole: async (
    organizationId: string,
    memberId: string,
    role: PlatformOrganizationRole,
  ): Promise<PlatformOrganizationMember> => {
    const { data } = await httpClient.put<PlatformOrganizationMember>(
      `/platform-admin/organizations/${organizationId}/members/${memberId}/role`,
      { role },
    );
    return data;
  },
};
