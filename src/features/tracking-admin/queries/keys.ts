import type { ExploreRequest, FunnelRequest, PathsRequest, PathSessionsRequest, ReportRange, RetentionRequest } from '@live-show/api-contracts';

export const trackingAdminKeys = {
  all: ['tracking-admin'] as const,
  overview: () => [...trackingAdminKeys.all, 'overview'] as const,
  sources: () => [...trackingAdminKeys.all, 'sources'] as const,
  plan: () => [...trackingAdminKeys.all, 'plan'] as const,
  unplanned: () => [...trackingAdminKeys.all, 'unplanned'] as const,
  destinations: () => [...trackingAdminKeys.all, 'destinations'] as const,
  deliveries: (id: string) => [...trackingAdminKeys.all, 'destinations', id, 'deliveries'] as const,
  explore: (req: ExploreRequest | null) => [...trackingAdminKeys.all, 'explore', req] as const,
  funnel: (req: FunnelRequest | null) => [...trackingAdminKeys.all, 'funnel', req] as const,
  retention: (req: RetentionRequest | null) => [...trackingAdminKeys.all, 'retention', req] as const,
  features: (req: ReportRange | null) => [...trackingAdminKeys.all, 'features', req] as const,
  paths: (req: PathsRequest | null) => [...trackingAdminKeys.all, 'paths', req] as const,
  pathSessions: (req: PathSessionsRequest | null) => [...trackingAdminKeys.all, 'paths', 'sessions', req] as const,
  sessionJourney: (sessionId: string, anonymousId: string) =>
    [...trackingAdminKeys.all, 'sessions', sessionId, anonymousId] as const,
  user: (id: string) => [...trackingAdminKeys.all, 'users', id] as const,
  userEvents: (id: string) => [...trackingAdminKeys.all, 'users', id, 'events'] as const,
};
