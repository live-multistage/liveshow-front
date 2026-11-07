// Advertiser-side types (CreateAdRequest, AdResponse, AdReviewEntry, etc.)
// moved to the external Ads Manager. Only the serve-side contract remains.
export type AdPlacement =
  | 'FEED'
  | 'EVENT_DETAIL'
  | 'CHECKOUT'
  | 'POST_PURCHASE'
  | 'PLAYER_PAUSE'
  | 'PRE_ROLL';

export type AdDestination =
  | { type: 'EVENT'; eventId: string }
  | { type: 'EXTERNAL_URL'; url: string };

export type AdPauseVariant = 'STANDARD' | 'FULLSCREEN';

export interface ServedAd {
  servedId: string;
  adId: string;
  title: string;
  format: string;
  /** null for platform (HOUSE) ads. */
  advertiserAccountId: string | null;
  destination: AdDestination | null;
  bannerUrl: string | null;
  videoUrl: string | null;
  videoDurationSec: number | null;
  /** Layout of a PLAYER_PAUSE creative; null for every other placement. */
  pauseVariant: AdPauseVariant | null;
}

/** Non-billable player beacons: POST /ads/serve/:servedId/event { type }. Idempotent per (servedId, type). */
export type AdServedEventType =
  | 'video_q25'
  | 'video_q50'
  | 'video_q75'
  | 'video_complete'
  | 'video_skip'
  | 'video_unmute'
  | 'pause_close';

export interface AdVideoEventTotals {
  q25: number;
  q50: number;
  q75: number;
  complete: number;
  skip: number;
  unmute: number;
}

export interface AdPauseEventTotals {
  closed: number;
}
