import { httpClient } from '@/lib/http/client';
import type {
  CreatedSource,
  DestinationDelivery,
  ExploreReport,
  ExploreRequest,
  FeaturesReport,
  FunnelReport,
  FunnelRequest,
  OverviewReport,
  PlanEvent,
  ReportRange,
  RetentionReport,
  RetentionRequest,
  SourceKind,
  TrackingDestination,
  TrackingSource,
  TrackingUserEventsPage,
  TrackingUserProfile,
  UnplannedEvent,
} from '@live-show/api-contracts';

export const trackingAdminService = {
  getOverview: async (): Promise<OverviewReport> => {
    const { data } = await httpClient.get<OverviewReport>('/tracking/overview');
    return data;
  },

  getSources: async (): Promise<TrackingSource[]> => {
    const { data } = await httpClient.get<TrackingSource[]>('/tracking/sources');
    return data;
  },

  createSource: async (payload: { name: string; kind: SourceKind }): Promise<CreatedSource> => {
    const { data } = await httpClient.post<CreatedSource>('/tracking/sources', payload);
    return data;
  },

  rotateSourceKey: async (id: string): Promise<CreatedSource> => {
    const { data } = await httpClient.post<CreatedSource>(`/tracking/sources/${encodeURIComponent(id)}/rotate-key`);
    return data;
  },

  updateSource: async (id: string, patch: { name?: string; enabled?: boolean }): Promise<TrackingSource> => {
    const { data } = await httpClient.patch<TrackingSource>(`/tracking/sources/${encodeURIComponent(id)}`, patch);
    return data;
  },

  getPlan: async (): Promise<PlanEvent[]> => {
    const { data } = await httpClient.get<PlanEvent[]>('/tracking/plan');
    return data;
  },

  getUnplannedEvents: async (): Promise<UnplannedEvent[]> => {
    const { data } = await httpClient.get<UnplannedEvent[]>('/tracking/plan/unplanned');
    return data;
  },

  upsertPlanEvent: async (
    name: string,
    payload: Omit<PlanEvent, 'name' | 'updatedAt'>,
  ): Promise<PlanEvent> => {
    const { data } = await httpClient.put<PlanEvent>(`/tracking/plan/${encodeURIComponent(name)}`, payload);
    return data;
  },

  deletePlanEvent: async (name: string): Promise<void> => {
    await httpClient.delete(`/tracking/plan/${encodeURIComponent(name)}`);
  },

  getDestinations: async (): Promise<TrackingDestination[]> => {
    const { data } = await httpClient.get<TrackingDestination[]>('/tracking/destinations');
    return data;
  },

  createDestination: async (payload: {
    name: string;
    url: string;
    eventFilter: string[];
  }): Promise<TrackingDestination & { secret: string }> => {
    const { data } = await httpClient.post<TrackingDestination & { secret: string }>(
      '/tracking/destinations',
      payload,
    );
    return data;
  },

  updateDestination: async (
    id: string,
    patch: { name?: string; url?: string; eventFilter?: string[]; enabled?: boolean },
  ): Promise<TrackingDestination> => {
    const { data } = await httpClient.patch<TrackingDestination>(
      `/tracking/destinations/${encodeURIComponent(id)}`,
      patch,
    );
    return data;
  },

  deleteDestination: async (id: string): Promise<void> => {
    await httpClient.delete(`/tracking/destinations/${encodeURIComponent(id)}`);
  },

  getDestinationDeliveries: async (id: string, limit = 50): Promise<DestinationDelivery[]> => {
    const { data } = await httpClient.get<DestinationDelivery[]>(
      `/tracking/destinations/${encodeURIComponent(id)}/deliveries`,
      { params: { limit } },
    );
    return data;
  },

  testDestination: async (id: string): Promise<{ status: number | null; error: string | null }> => {
    const { data } = await httpClient.post<{ status: number | null; error: string | null }>(
      `/tracking/destinations/${encodeURIComponent(id)}/test`,
    );
    return data;
  },

  exploreReport: async (req: ExploreRequest): Promise<ExploreReport> => {
    const { data } = await httpClient.post<ExploreReport>('/tracking/reports/explore', req);
    return data;
  },

  funnelReport: async (req: FunnelRequest): Promise<FunnelReport> => {
    const { data } = await httpClient.post<FunnelReport>('/tracking/reports/funnel', req);
    return data;
  },

  retentionReport: async (req: RetentionRequest): Promise<RetentionReport> => {
    const { data } = await httpClient.post<RetentionReport>('/tracking/reports/retention', req);
    return data;
  },

  featuresReport: async (req: ReportRange): Promise<FeaturesReport> => {
    const { data } = await httpClient.post<FeaturesReport>('/tracking/reports/features', req);
    return data;
  },

  getUser: async (id: string): Promise<TrackingUserProfile> => {
    const { data } = await httpClient.get<TrackingUserProfile>(`/tracking/users/${encodeURIComponent(id)}`);
    return data;
  },

  getUserEvents: async (id: string, params: { cursor?: string; limit?: number }): Promise<TrackingUserEventsPage> => {
    const { data } = await httpClient.get<TrackingUserEventsPage>(
      `/tracking/users/${encodeURIComponent(id)}/events`,
      { params: { cursor: params.cursor, limit: params.limit ?? 50 } },
    );
    return data;
  },
};
