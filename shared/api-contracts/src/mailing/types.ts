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

export type MailingAudienceType = 'ALL_VERIFIED' | 'EVENT_BUYERS' | 'EVENT_SAVERS' | 'CHANNEL_SUBSCRIBERS';

export type MailingAudience =
  | { type: 'ALL_VERIFIED'; country?: string }
  | { type: 'EVENT_BUYERS'; eventId: string; country?: string }
  | { type: 'EVENT_SAVERS'; eventId: string; country?: string }
  | { type: 'CHANNEL_SUBSCRIBERS'; channelId: string; country?: string };

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
