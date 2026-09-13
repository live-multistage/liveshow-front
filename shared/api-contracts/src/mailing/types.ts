import type { EventCategory } from '../events/types';

export type MailingCategory = 'MARKETING' | 'ANNOUNCEMENT';
export type MailingLanguage = 'pt' | 'en' | 'es';

export const MAILING_LIMITS = {
  maxBlocks: 30,
  nameMax: 120,
  subjectMax: 150,
  preheaderMax: 200,
  headingMax: 120,
  textBlockMax: 2000,
  labelMax: 60,
  altMax: 200,
  urlMax: 2048,
  eventListMin: 1,
  eventListMax: 3,
} as const;

export interface MailingTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
}

export interface MailingHeadingBlock { type: 'heading'; text: string; size: 'lg' | 'md' }
export interface MailingTextBlock { type: 'text'; paragraphs: MailingTextRun[][] }
export interface MailingImageBlock { type: 'image'; assetKey: string; alt: string; href?: string }
export interface MailingButtonBlock { type: 'button'; label: string; href: string }
export interface MailingEventCardBlock { type: 'eventCard'; eventId: string; badge?: string; ctaLabel?: string }
export interface MailingEventListBlock { type: 'eventList'; eventIds: string[] }
export interface MailingDividerBlock { type: 'divider' }

export type MailingBlock =
  | MailingHeadingBlock
  | MailingTextBlock
  | MailingImageBlock
  | MailingButtonBlock
  | MailingEventCardBlock
  | MailingEventListBlock
  | MailingDividerBlock;

export type MailingBlockType = MailingBlock['type'];

export interface MailingTemplateDraft {
  name: string;
  category: MailingCategory;
  subject: string;
  preheader: string;
  language: MailingLanguage;
  blocks: MailingBlock[];
}

export type MailingPreviewRequest = Omit<MailingTemplateDraft, 'name'>;

export interface MailingPreviewResponse {
  subject: string;
  html: string;
  text: string;
}

export interface MailingTemplate extends MailingTemplateDraft {
  id: string;
  version: number;
  lastTestedVersion: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type MailingTemplateSummary = Pick<
  MailingTemplate,
  'id' | 'name' | 'category' | 'language' | 'version' | 'lastTestedVersion' | 'updatedAt'
>;

export interface MailingAssetResponse {
  assetKey: string;
  url: string;
}

export type MailingAudienceType =
  | 'ALL_VERIFIED'
  | 'EVENT_BUYERS'
  | 'EVENT_SAVERS'
  | 'CHANNEL_SUBSCRIBERS'
  | 'EVENT_BUYERS_NOT_WATCHED'
  | 'ORG_BUYERS'
  | 'ARTIST_BUYERS'
  | 'CATEGORY_BUYERS'
  | 'ABANDONED_CARTS'
  | 'PENDING_ORDERS'
  | 'COUPON_USERS'
  | 'REFUNDED_BUYERS'
  | 'NEVER_PURCHASED'
  | 'REPEAT_BUYERS'
  | 'INACTIVE_USERS'
  | 'CHANNEL_EXPIRING'
  | 'CHANNEL_CHURNED'
  | 'FREE_ONLY_VIEWERS'
  | 'APP_USERS'
  | 'NO_APP_USERS'
  | 'ORG_MEMBERS'
  | 'ORG_MEMBERS_INACTIVE'
  | 'APPLICANTS'
  | 'ADVERTISERS'
  | 'ARTIST_OWNERS'
  | 'ARTIST_FOLLOWERS'
  | 'ORG_FOLLOWERS';

export const MAILING_AUDIENCE_TYPES: MailingAudienceType[] = [
  'ALL_VERIFIED',
  'EVENT_BUYERS',
  'EVENT_SAVERS',
  'CHANNEL_SUBSCRIBERS',
  'EVENT_BUYERS_NOT_WATCHED',
  'ORG_BUYERS',
  'ARTIST_BUYERS',
  'CATEGORY_BUYERS',
  'ABANDONED_CARTS',
  'PENDING_ORDERS',
  'COUPON_USERS',
  'REFUNDED_BUYERS',
  'NEVER_PURCHASED',
  'REPEAT_BUYERS',
  'INACTIVE_USERS',
  'CHANNEL_EXPIRING',
  'CHANNEL_CHURNED',
  'FREE_ONLY_VIEWERS',
  'APP_USERS',
  'NO_APP_USERS',
  'ORG_MEMBERS',
  'ORG_MEMBERS_INACTIVE',
  'APPLICANTS',
  'ADVERTISERS',
  'ARTIST_OWNERS',
  'ARTIST_FOLLOWERS',
  'ORG_FOLLOWERS',
];

export const MAILING_AUDIENCE_GROUPS: Array<{
  id: 'core' | 'event' | 'funnel' | 'engagement' | 'b2b' | 'follows';
  types: MailingAudienceType[];
}> = [
  { id: 'core', types: ['ALL_VERIFIED'] },
  {
    id: 'event',
    types: ['EVENT_BUYERS', 'EVENT_SAVERS', 'EVENT_BUYERS_NOT_WATCHED', 'ORG_BUYERS', 'ARTIST_BUYERS', 'CATEGORY_BUYERS'],
  },
  {
    id: 'funnel',
    types: ['ABANDONED_CARTS', 'PENDING_ORDERS', 'COUPON_USERS', 'REFUNDED_BUYERS', 'NEVER_PURCHASED', 'REPEAT_BUYERS'],
  },
  {
    id: 'engagement',
    types: [
      'CHANNEL_SUBSCRIBERS',
      'INACTIVE_USERS',
      'CHANNEL_EXPIRING',
      'CHANNEL_CHURNED',
      'FREE_ONLY_VIEWERS',
      'APP_USERS',
      'NO_APP_USERS',
    ],
  },
  { id: 'b2b', types: ['ORG_MEMBERS', 'ORG_MEMBERS_INACTIVE', 'APPLICANTS', 'ADVERTISERS', 'ARTIST_OWNERS'] },
  { id: 'follows', types: ['ARTIST_FOLLOWERS', 'ORG_FOLLOWERS'] },
];

// Kept in sync with events/types.ts EventCategory; a copy because this table
// is generic over string enums and importing the union type is enough,
// re-declaring the value array keeps this module self-contained for the
// audience spec table below.
export const MAILING_EVENT_CATEGORIES: EventCategory[] = [
  'MUSIC', 'COMEDY', 'THEATER', 'DANCE', 'SPORTS',
  'FOOTBALL', 'MOTORSPORT', 'CORPORATE',
  'TALK', 'RELIGIOUS', 'EDUCATION', 'OTHER',
];

export const MAILING_APPLICATION_KINDS = ['ORGANIZER', 'ARTIST'] as const;
export type MailingApplicationKind = (typeof MAILING_APPLICATION_KINDS)[number];

export const MAILING_APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type MailingApplicationStatus = (typeof MAILING_APPLICATION_STATUSES)[number];

export type MailingAudienceParamKind =
  | 'eventId'
  | 'channelId'
  | 'organizationId'
  | 'artistId'
  | 'couponCode'
  | 'eventCategory'
  | 'applicationKind'
  | 'applicationStatus'
  | 'int';

export interface MailingAudienceParamSpec {
  kind: MailingAudienceParamKind;
  optional?: boolean;
  min?: number;
  max?: number;
  default?: number;
}

export const MAILING_AUDIENCE_SPECS: Record<MailingAudienceType, Record<string, MailingAudienceParamSpec>> = {
  ALL_VERIFIED: {},
  EVENT_BUYERS: { eventId: { kind: 'eventId' } },
  EVENT_SAVERS: { eventId: { kind: 'eventId' } },
  CHANNEL_SUBSCRIBERS: { channelId: { kind: 'channelId' } },
  EVENT_BUYERS_NOT_WATCHED: { eventId: { kind: 'eventId' } },
  ORG_BUYERS: { organizationId: { kind: 'organizationId' } },
  ARTIST_BUYERS: { artistId: { kind: 'artistId' } },
  CATEGORY_BUYERS: { eventCategory: { kind: 'eventCategory' } },
  ABANDONED_CARTS: { olderThanHours: { kind: 'int', min: 1, max: 720, default: 24 } },
  PENDING_ORDERS: { olderThanHours: { kind: 'int', min: 1, max: 168, default: 1 } },
  COUPON_USERS: { couponCode: { kind: 'couponCode' } },
  REFUNDED_BUYERS: {},
  NEVER_PURCHASED: { minAccountAgeDays: { kind: 'int', min: 0, max: 3650, default: 30 } },
  REPEAT_BUYERS: { minEvents: { kind: 'int', min: 2, max: 100, default: 3 } },
  INACTIVE_USERS: { days: { kind: 'int', min: 7, max: 730, default: 60 } },
  CHANNEL_EXPIRING: {
    channelId: { kind: 'channelId', optional: true },
    withinDays: { kind: 'int', min: 1, max: 90, default: 7 },
  },
  CHANNEL_CHURNED: { channelId: { kind: 'channelId', optional: true } },
  FREE_ONLY_VIEWERS: {},
  APP_USERS: {},
  NO_APP_USERS: {},
  ORG_MEMBERS: { organizationId: { kind: 'organizationId', optional: true } },
  ORG_MEMBERS_INACTIVE: { days: { kind: 'int', min: 7, max: 730, default: 60 } },
  APPLICANTS: { applicationKind: { kind: 'applicationKind' }, applicationStatus: { kind: 'applicationStatus' } },
  ADVERTISERS: {},
  ARTIST_OWNERS: {},
  ARTIST_FOLLOWERS: { artistId: { kind: 'artistId' } },
  ORG_FOLLOWERS: { organizationId: { kind: 'organizationId' } },
};

export type MailingAudience =
  | { type: 'ALL_VERIFIED'; country?: string }
  | { type: 'EVENT_BUYERS'; eventId: string; country?: string }
  | { type: 'EVENT_SAVERS'; eventId: string; country?: string }
  | { type: 'CHANNEL_SUBSCRIBERS'; channelId: string; country?: string }
  | { type: 'EVENT_BUYERS_NOT_WATCHED'; eventId: string; country?: string }
  | { type: 'ORG_BUYERS'; organizationId: string; country?: string }
  | { type: 'ARTIST_BUYERS'; artistId: string; country?: string }
  | { type: 'CATEGORY_BUYERS'; eventCategory: EventCategory; country?: string }
  | { type: 'ABANDONED_CARTS'; olderThanHours: number; country?: string }
  | { type: 'PENDING_ORDERS'; olderThanHours: number; country?: string }
  | { type: 'COUPON_USERS'; couponCode: string; country?: string }
  | { type: 'REFUNDED_BUYERS'; country?: string }
  | { type: 'NEVER_PURCHASED'; minAccountAgeDays: number; country?: string }
  | { type: 'REPEAT_BUYERS'; minEvents: number; country?: string }
  | { type: 'INACTIVE_USERS'; days: number; country?: string }
  | { type: 'CHANNEL_EXPIRING'; channelId?: string; withinDays: number; country?: string }
  | { type: 'CHANNEL_CHURNED'; channelId?: string; country?: string }
  | { type: 'FREE_ONLY_VIEWERS'; country?: string }
  | { type: 'APP_USERS'; country?: string }
  | { type: 'NO_APP_USERS'; country?: string }
  | { type: 'ORG_MEMBERS'; organizationId?: string; country?: string }
  | { type: 'ORG_MEMBERS_INACTIVE'; days: number; country?: string }
  | { type: 'APPLICANTS'; applicationKind: MailingApplicationKind; applicationStatus: MailingApplicationStatus; country?: string }
  | { type: 'ADVERTISERS'; country?: string }
  | { type: 'ARTIST_OWNERS'; country?: string }
  | { type: 'ARTIST_FOLLOWERS'; artistId: string; country?: string }
  | { type: 'ORG_FOLLOWERS'; organizationId: string; country?: string };

export interface AudienceCountRequest {
  audience: MailingAudience;
  category: MailingCategory;
}

export interface AudienceCountResponse {
  total: number;
  eligible: number;
  skipped: { optedOut: number; unverified: number; deleted: number };
  estimatedDays: number;
}

export type MailingCampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED';

export interface MailingCampaignSummary {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  audience: MailingAudience;
  status: MailingCampaignStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  /** null until the recipient list is materialized. */
  totalRecipients: number | null;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  createdAt: string;
}

export interface MailingCampaignBreakdown {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  skippedOptedOut: number;
  skippedUnverified: number;
  skippedDeleted: number;
  skippedCancelled: number;
}

export interface MailingCampaignDetail extends MailingCampaignSummary {
  category: MailingCategory;
  /** Frozen subject once dispatched; the template's current subject while DRAFT. */
  subject: string;
  breakdown: MailingCampaignBreakdown;
  dailyCap: number;
}

export interface CreateMailingCampaignRequest {
  name: string;
  templateId: string;
  audience: MailingAudience;
}

export type UpdateMailingCampaignRequest = Partial<CreateMailingCampaignRequest>;

export interface DispatchMailingCampaignRequest {
  /** ISO 8601. Omitted or in the past = now. */
  scheduledAt?: string;
}

export interface MailingUnsubscribeResponse {
  ok: true;
}

export type MailingErrorCode = 'TEMPLATE_NOT_TESTED' | 'TOKEN_INVALID' | 'CAMPAIGN_NOT_EDITABLE';
