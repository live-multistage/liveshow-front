import type { LiveCamera, LiveStage } from '@/features/streaming/types/live.types';

export type ChannelStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ChannelAccessMode = 'FREE' | 'SUBSCRIPTION';
export type SubscriptionInterval = 'MONTHLY' | 'YEARLY';
export type ChannelSubscriptionStatus = 'INCOMPLETE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

// A channel simulcasting a scheduled Event — either automatically (a linked
// program's window) or by manual override. See docs/superpowers/specs
// 2026-08-22-channel-simulcast-design.md §3.3.
export type ChannelSourceMode = 'own' | 'event';
export type ChannelSourceReason = 'own' | 'override' | 'program';

export interface ChannelSourceEvent {
  id: string;
  // Optional across every projection below: these routes don't all select the
  // event's slug yet, and eventHref falls back to the id when it's absent.
  slug?: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
}

export interface ChannelSource {
  mode: ChannelSourceMode;
  reason: ChannelSourceReason;
  event: ChannelSourceEvent | null;
}

// A manual "carry this Event" override set from the dashboard on-air panel.
// `until` is server-computed (the event's endsAt) — the frontend never sets it.
export interface ChannelSourceOverride {
  eventId: string;
  until: string | null;
}

export interface ChannelPricing {
  currency: string | null;
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
}

export interface ChannelViewerState {
  subscribed: boolean;
  status: ChannelSubscriptionStatus | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export interface ScheduledSlot {
  programId: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

// The current slot only: carries the LIVE occurrence Event id when one is on
// the air for this exact window, so the viewer/dashboard can deep-link to it
// (chat, viewer count) without a second lookup. Null while the slot hasn't
// gone live yet, or when there is no scheduled slot at all.
export interface CurrentSlot extends ScheduledSlot {
  eventId: string | null;
}

export type ProgramEpisodeStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'SCHEDULED'
  | 'LIVE'
  | 'FINISHED'
  | 'CANCELLED';

export interface ProgramEpisode {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: ProgramEpisodeStatus;
}

export interface Channel {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  accessMode: ChannelAccessMode;
  status: ChannelStatus;
  broadcastEventId: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicChannel extends Channel {
  isOnAir: boolean;
  current: CurrentSlot | null;
  next: ScheduledSlot | null;
  today: ScheduledSlot[];
  pricing: ChannelPricing | null;
  /** Null for anonymous readers — there is no viewer to describe. */
  viewer: ChannelViewerState | null;
  source: ChannelSource;
}

// GET /channels/:slug/playback — the existing live playback payload plus the
// resolved source. Viewer tracking and the viewer count follow whatever is
// actually on screen, so they bind to `playbackEventId` (the event currently
// playing — the channel's own broadcast, or a carried event). Chat is scoped
// to the channel's own persistent room, so it binds to `channelEventId` /
// `channel.broadcastEventId` instead and never moves when the source does.
export interface ChannelPlaybackResponse {
  live: boolean;
  latencyMode: 'STANDARD' | 'LOW';
  stages?: LiveStage[];
  cameras: LiveCamera[];
  primaryCameraId: string | null;
  librasCameraId: string | null;
  playbackEventId: string;
  channelEventId: string;
  source: ChannelSource;
}

export interface ChannelListItem extends Channel {
  isOnAir: boolean;
  current: ScheduledSlot | null;
  next: ScheduledSlot | null;
}

export type ProgramLatencyMode = 'STANDARD' | 'LOW';

export interface Program {
  id: string;
  channelId: string;
  name: string;
  description: string | null;
  startTime: string;
  durationMin: number;
  rrule: string;
  latencyMode: ProgramLatencyMode;
  recordingEnabled: boolean;
}

// Org-only shape: create/update/publish/archive/pricing-sync and the org
// channel list all return these pricing fields on top of the base Channel;
// the public catalog (by-slug, published list) never does.
export interface OrgChannel extends Channel {
  currency: string | null;
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
  pricingSynced: boolean;
  sourceOverride: ChannelSourceOverride | null;
  // Same live/now-next projection the public list carries — drives the
  // dashboard list's on-air status and current/next program.
  isOnAir: boolean;
  current: ScheduledSlot | null;
  next: ScheduledSlot | null;
  // Enabled cameras across every one of the channel's Programs' streams —
  // added to the channel's own broadcast cameras for the readiness checklist.
  programCameraCount: number;
}

export interface ChannelSubscriptionSummary {
  active: number;
  pastDue: number;
  canceledThisMonth: number;
  mrrCents: number;
}

export interface CreateChannelInput {
  organizationId: string;
  slug: string;
  name: string;
  description?: string;
  timezone: string;
  accessMode?: ChannelAccessMode;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  timezone?: string;
  accessMode?: ChannelAccessMode;
  currency?: string;
  // `null` clears the price on the backend; `undefined` leaves it untouched.
  monthlyPriceCents?: number | null;
  yearlyPriceCents?: number | null;
}

export interface UpsertProgramInput {
  name: string;
  description?: string;
  startTime: string;
  durationMin: number;
  rrule: string;
  latencyMode?: ProgramLatencyMode;
  recordingEnabled?: boolean;
}
