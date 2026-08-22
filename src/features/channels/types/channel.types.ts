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
  title: string;
  startsAt: string;
  endsAt: string;
}

export interface ChannelSource {
  mode: ChannelSourceMode;
  reason: ChannelSourceReason;
  event: ChannelSourceEvent | null;
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
  // The Event this program's occurrence carries, if linked (simulcast).
  // Optional so pre-existing fixtures/callers that predate simulcast keep
  // compiling — the backend always sends it on `/channels/:slug/schedule`.
  event?: { id: string; title: string } | null;
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
  current: ScheduledSlot | null;
  next: ScheduledSlot | null;
  today: ScheduledSlot[];
  pricing: ChannelPricing | null;
  /** Null for anonymous readers — there is no viewer to describe. */
  viewer: ChannelViewerState | null;
  // Optional for the same reason as ScheduledSlot.event — pre-simulcast
  // fixtures keep compiling. The backend always sends it.
  source?: ChannelSource;
}

// GET /channels/:slug/playback — the existing live playback payload plus the
// resolved source. Chat and viewer count must bind to `channelEventId`
// (the channel's own technical event), never `playbackEventId` (the event
// currently playing, which changes when the source switches).
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
}

export interface Program {
  id: string;
  channelId: string;
  name: string;
  description: string | null;
  startTime: string;
  durationMin: number;
  rrule: string;
}

// Org-only shape: create/update/publish/archive/pricing-sync and the org
// channel list all return these pricing fields on top of the base Channel;
// the public catalog (by-slug, published list) never does.
export interface OrgChannel extends Channel {
  currency: string | null;
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
  pricingSynced: boolean;
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
}
