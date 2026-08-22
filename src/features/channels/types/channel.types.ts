export type ChannelStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ChannelAccessMode = 'FREE' | 'SUBSCRIPTION';
export type SubscriptionInterval = 'MONTHLY' | 'YEARLY';
export type ChannelSubscriptionStatus = 'INCOMPLETE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

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
}

export interface UpsertProgramInput {
  name: string;
  description?: string;
  startTime: string;
  durationMin: number;
  rrule: string;
}
