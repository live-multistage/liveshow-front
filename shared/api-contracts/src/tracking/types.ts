export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export const TRACKING_LIMITS = {
  maxBatchMessages: 100,
  maxBatchBytes: 500 * 1024,
  maxMessageBytes: 32 * 1024,
  maxPropertyDepth: 5,
  maxReportRangeDays: 90,
} as const;

export const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;
export const isValidEventName = (name: string): boolean => EVENT_NAME_PATTERN.test(name);

export interface TrackingContext {
  library: { name: string; version: string };
  page?: { path: string; url: string; referrer?: string; title?: string; search?: string };
  campaign?: { source?: string; medium?: string; name?: string; term?: string; content?: string };
  locale?: string;
  userAgent?: string;
  screen?: { width: number; height: number };
  sessionId: string;
}

export interface BaseMessage {
  messageId: string;
  anonymousId: string;
  userId?: string;
  timestamp: string;
  sentAt?: string;
  context: TrackingContext;
}

export type TrackingMessage = BaseMessage & (
  | { type: 'track'; event: string; properties?: Record<string, Json> }
  | { type: 'page'; name?: string; properties?: Record<string, Json> }
  | { type: 'identify'; traits?: Record<string, Json> }
  | { type: 'group'; groupId: string; traits?: Record<string, Json> }
  | { type: 'alias'; previousId: string }
);
export type TrackingMessageType = TrackingMessage['type'];

export interface TrackingBatchRequest { writeKey: string; batch: TrackingMessage[] }
export interface TrackingBatchResponse { accepted: number; rejected: number }

export type ViolationKind =
  | 'unplanned_event' | 'missing_required' | 'wrong_type' | 'not_in_enum'
  | 'unexpected_property' | 'deprecated_event';
export interface Violation { kind: ViolationKind; property?: string; detail?: string }

// Tracking Plan (constrained subset, see spec "Tracking Plan")
export type PlanPropertyType = 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
export interface PlanProperty { name: string; type: PlanPropertyType; required: boolean; enumValues?: string[]; description?: string }
export type PlanEventStatus = 'draft' | 'live' | 'deprecated';
export interface PlanEvent { name: string; description: string; owner: string | null; properties: PlanProperty[]; status: PlanEventStatus; updatedAt: string }
export interface UnplannedEvent { name: string; firstSeenAt: string; lastSeenAt: string; count: number }

// Sources / destinations
export type SourceKind = 'web' | 'server';
export interface TrackingSource { id: string; name: string; kind: SourceKind; writeKeyPrefix: string | null; enabled: boolean; createdAt: string }
export interface CreatedSource extends TrackingSource { writeKey: string } // returned once
export interface TrackingDestination { id: string; name: string; url: string; eventFilter: string[]; enabled: boolean; createdAt: string }
export type DeliveryStatus = 'pending' | 'delivered' | 'failed';
export interface DestinationDelivery { id: string; destinationId: string; status: DeliveryStatus; attempts: number; lastError: string | null; messageCount: number; createdAt: string }

// Debugger stream frames
export type LiveFrame =
  | { kind: 'message'; status: 'accepted'; message: TrackingMessage & { sourceId: string; violations: Violation[] | null } }
  | { kind: 'message'; status: 'rejected'; reason: string; raw: unknown; sourceId: string }
  | { kind: 'dropped'; count: number };

// Reports
export interface ReportRange { from: string; to: string }
export interface OverviewReport {
  hourly: { hour: string; count: number }[];
  topEvents: { event: string; count: number }[];
  violationRate: number;
  queue: { waiting: number; failed: number };
  sources: { id: string; name: string; lastSeenAt: string | null }[];
}
export interface ExploreRequest extends ReportRange { event: string; interval: 'hour' | 'day'; breakdown?: string }
export interface ExploreReport { series: { key: string; points: { at: string; count: number }[] }[] }
export interface FunnelRequest extends ReportRange { steps: string[]; windowMinutes: number }
export interface FunnelReport { steps: { event: string; count: number; conversionFromPrevious: number; conversionFromFirst: number }[] }
export interface RetentionRequest extends ReportRange { startEvent: string; returnEvent: string; weeks: number }
export interface RetentionReport { cohorts: { week: string; size: number; returned: number[] }[] }
export interface FeaturesReport { features: { feature: string; sessions: number; users: number; p50Ms: number; p75Ms: number }[] }

export interface TrackingUserProfile {
  userId: string; traits: Record<string, Json>; groupIds: string[];
  anonymousIds: string[]; analyticsConsent: boolean | null;
}
export interface TrackingUserEventsPage { items: (TrackingMessage & { ts: string; violations: Violation[] | null })[]; nextCursor: string | null }

// Paths (Sankey) + session journey — spec 2026-10-02-tracking-paths-design.md
export type PathDirection = 'after' | 'before' | 'both';
export const PATH_NODE = { start: '__start__', exit: '__exit__', other: '__other__' } as const;

// Paths reports scan every event of every session in range; past ~31 days
// they no longer fit the 10 s report timeout (measured 2026-10-02).
export const PATHS_MAX_RANGE_DAYS = 31;

export interface PathsRequest extends ReportRange {
  anchor: string;
  direction: PathDirection;
  steps: number;
  topK: number;
}
export interface PathNode { key: string; sessions: number }
export interface PathColumn { offset: number; nodes: PathNode[] }
export interface PathLink { fromOffset: number; from: string; to: string; sessions: number }
export interface PathsReport { sessions: number; columns: PathColumn[]; links: PathLink[] }

export interface PathMatch { offset: number; node: string }
export interface PathSessionsRequest extends ReportRange {
  anchor: string;
  direction: PathDirection;
  steps: number;
  match: PathMatch[];
}
export interface PathSessionSample {
  sessionId: string;
  anonymousId: string;
  userId: string | null;
  startedAt: string;
  durationSeconds: number;
  steps: number;
}
export interface PathSessionsReport { sessions: PathSessionSample[] }

export type JourneyItemOrigin = 'client' | 'server';
export type SessionJourneyItem = TrackingMessage & {
  ts: string;
  origin: JourneyItemOrigin;
  node: string | null;
  violations: Violation[] | null;
};
export interface SessionJourney {
  sessionId: string;
  anonymousId: string;
  userId: string | null;
  startedAt: string;
  endedAt: string;
  items: SessionJourneyItem[];
}
