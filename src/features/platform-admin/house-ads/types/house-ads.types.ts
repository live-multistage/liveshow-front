import type { AgeBracket } from '@live-show/api-contracts';

export type { AgeBracket };

// Mirrors src/advertisements/domain/ad-format.enum.ts (orchestrator).
export type HouseAdFormat = 'HORIZONTAL_728x90' | 'VERTICAL_300x600' | 'WIDE_16_9' | 'VIDEO_16_9';

// Mirrors src/advertisements/domain/ad-placement.enum.ts (orchestrator).
export type HouseAdPlacement = 'FEED' | 'EVENT_DETAIL' | 'CHECKOUT' | 'POST_PURCHASE' | 'PLAYER_PAUSE' | 'PRE_ROLL';

// Mirrors src/advertisements/domain/ad-status.enum.ts (orchestrator). A house
// ad never enters REVIEW (no approval queue), but the field is shared with
// paid ads so the union stays complete.
export type HouseAdStatus = 'DRAFT' | 'REVIEW' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'REJECTED';

// Mirrors src/advertisements/domain/ad-house-priority.enum.ts (orchestrator).
// PRIORITY runs ahead of paid ads; FILL only serves when no paid ad applies.
export type HouseAdPriority = 'PRIORITY' | 'FILL';

// Mirrors src/advertisements/domain/ad-destination.ts (orchestrator).
export type HouseAdDestination =
  | { type: 'EVENT'; eventId: string }
  | { type: 'EXTERNAL_URL'; url: string };

// Mirrors ADVERTISER_AGE_BRACKETS (src/shared/domain/age-bracket.enum.ts,
// orchestrator): minors (AGE_13_17) are never targetable, house ads included.
export const HOUSE_AD_TARGETABLE_AGE_BRACKETS: AgeBracket[] = [
  'AGE_18_24',
  'AGE_25_34',
  'AGE_35_44',
  'AGE_45_54',
  'AGE_55_PLUS',
];

export type HouseAdFrequencyCapWindow = 'day' | 'total';

// Single source of truth for which creative formats a placement can render.
// Mirrors src/advertisements/domain/placement-accepted-formats.ts
// (orchestrator) by hand — same trust boundary as the rest of this file.
const PAGE_FORMATS: HouseAdFormat[] = ['HORIZONTAL_728x90', 'VERTICAL_300x600'];

export const HOUSE_AD_PLACEMENT_ACCEPTED_FORMATS: Record<HouseAdPlacement, HouseAdFormat[]> = {
  FEED: PAGE_FORMATS,
  EVENT_DETAIL: PAGE_FORMATS,
  CHECKOUT: PAGE_FORMATS,
  POST_PURCHASE: PAGE_FORMATS,
  PLAYER_PAUSE: ['WIDE_16_9'],
  PRE_ROLL: ['VIDEO_16_9'],
};

// GET /platform-admin/house-ads row (ListHouseAdsUseCase).
export interface HouseAdListItem {
  id: string;
  title: string;
  destination: HouseAdDestination | null;
  format: HouseAdFormat;
  placements: HouseAdPlacement[];
  startsAt: string;
  endsAt: string;
  status: HouseAdStatus;
  housePriority: HouseAdPriority | null;
  impressions30d: number;
  clicks30d: number;
  ctr30d: number | null;
}

export interface HouseAdListResult {
  items: HouseAdListItem[];
  total: number;
}

export interface HouseAdListFilter {
  status?: HouseAdStatus;
  priority?: HouseAdPriority;
  page: number;
  limit: number;
}

// POST /platform-admin/house-ads body.
export interface CreateHouseAdRequest {
  destination?: HouseAdDestination;
  title: string;
  format: HouseAdFormat;
  placements: HouseAdPlacement[];
  targetDomains: string[];
  targetCategories: string[];
  targetAgeBrackets?: AgeBracket[];
  frequencyCapMax?: number;
  frequencyCapWindow?: HouseAdFrequencyCapWindow;
  housePriority: HouseAdPriority;
  startsAt: string;
  endsAt: string;
}

export interface CreateHouseAdResponse {
  id: string;
  status: HouseAdStatus;
  housePriority: HouseAdPriority | null;
}

// PATCH /platform-admin/house-ads/:id body — every field optional.
export type UpdateHouseAdRequest = Partial<CreateHouseAdRequest>;

export interface UploadHouseAdBannerResponse {
  bannerUrl: string;
}

export interface UploadHouseAdVideoResponse {
  videoUrl: string;
  videoDurationSec: number;
}

// GET /platform-admin/house-ads/:id (GetHouseAdUseCase). The only endpoint
// that carries targeting, frequency cap and the creative URLs — the list row
// (HouseAdListItem) doesn't. No billing fields.
export interface HouseAdDetail {
  id: string;
  title: string;
  format: HouseAdFormat;
  placements: HouseAdPlacement[];
  destination: HouseAdDestination | null;
  targetDomains: string[];
  targetCategories: string[];
  targetAgeBrackets: AgeBracket[];
  frequencyCapMax: number | null;
  frequencyCapWindow: HouseAdFrequencyCapWindow | null;
  startsAt: string;
  endsAt: string;
  status: HouseAdStatus;
  housePriority: HouseAdPriority | null;
  bannerUrl: string | null;
  videoUrl: string | null;
  videoDurationSec: number | null;
}

// GET /platform-admin/house-ads/:id/report (GetHouseAdReportUseCase). No
// spend field anywhere — a house ad is never billed.
export interface HouseAdReportDailyPoint {
  date: string;
  impressions: number;
  clicks: number;
}

export interface HouseAdReportPlacementRow {
  placement: HouseAdPlacement;
  impressions: number;
  clicks: number;
  ctr: number | null;
}

export interface HouseAdReport {
  adId: string;
  title: string;
  status: HouseAdStatus;
  impressions: number;
  clicks: number;
  ctr: number | null;
  dailyBreakdown: HouseAdReportDailyPoint[];
  placementBreakdown: HouseAdReportPlacementRow[];
}

export type HouseAdStatusAction = 'publish' | 'pause' | 'resume' | 'end';
