import { httpClient } from '@/lib/http/client';
import type {
  OrganizationResponse,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  StripeAccountStatus,
} from '../types/organization.types';
import type { EventResponse } from '@/features/events/types/event.types';
import type { OrganizationAnalyticsResponse } from '../types/organization-analytics.types';
import type { SalesGranularity } from '@/features/analytics/types/sales.types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const organizationService = {
  getMyOrganizations: async (): Promise<OrganizationResponse[]> => {
    const { data } = await httpClient.get<OrganizationResponse[]>('/organizations/mine');
    return data;
  },

  getById: async (id: string): Promise<OrganizationResponse> => {
    const { data } = await httpClient.get<OrganizationResponse>(`/organizations/${id}`);
    return data;
  },

  create: async (payload: CreateOrganizationRequest): Promise<OrganizationResponse> => {
    const { data } = await httpClient.post<OrganizationResponse>('/organizations', payload);
    return data;
  },

  update: async (id: string, payload: UpdateOrganizationRequest): Promise<OrganizationResponse> => {
    const { data } = await httpClient.patch<OrganizationResponse>(`/organizations/${id}`, payload);
    return data;
  },

  getBySlug: async (slug: string): Promise<OrganizationResponse> => {
    const { data } = await httpClient.get<OrganizationResponse>(`/organizations/public/${slug}`);
    return data;
  },

  checkSlug: async (slug: string, excludeId?: string): Promise<{ available: boolean }> => {
    const { data } = await httpClient.get<{ available: boolean }>(
      '/organizations/check-slug',
      { params: { slug, ...(excludeId ? { excludeId } : {}) } },
    );
    return data;
  },

  /** Public endpoint — no auth/membership required. Accepts UUID or slug. */
  getByIdOrSlug: async (idOrSlug: string): Promise<OrganizationResponse> => {
    if (UUID_RE.test(idOrSlug)) {
      const { data } = await httpClient.get<OrganizationResponse>(
        `/organizations/public/by-id/${idOrSlug}`,
      );
      return data;
    }
    const { data } = await httpClient.get<OrganizationResponse>(
      `/organizations/public/${idOrSlug}`,
    );
    return data;
  },

  /** Public endpoint — returns only PUBLISHED/LIVE/FINISHED events. */
  getEvents: async (
    orgId: string,
    filter: 'upcoming' | 'past' | 'all' = 'all',
  ): Promise<EventResponse[]> => {
    const { data } = await httpClient.get<EventResponse[]>(
      `/organizations/public/by-id/${orgId}/events`,
      { params: { filter } },
    );
    return data;
  },

  getStripeStatus: async (orgId: string): Promise<StripeAccountStatus> => {
    const { data } = await httpClient.get<StripeAccountStatus>(
      `/organizations/${orgId}/stripe`,
    );
    return data;
  },

  initiateStripeConnect: async (orgId: string): Promise<{ url: string }> => {
    const { data } = await httpClient.post<{ url: string }>(
      `/organizations/${orgId}/stripe/connect`,
    );
    return data;
  },

  getAnalytics: async (orgId: string, granularity: SalesGranularity): Promise<OrganizationAnalyticsResponse> => {
    const { data } = await httpClient.get<OrganizationAnalyticsResponse>(
      `/organizations/${orgId}/analytics`,
      { params: { granularity } },
    );
    return data;
  },
};
