// Advertiser-side types (CreateAdRequest, AdResponse, AdReviewEntry, etc.)
// moved to the external Ads Manager. Only the serve-side contract remains.
export type AdPlacement =
  | 'FEED'
  | 'EVENT_DETAIL'
  | 'CHECKOUT'
  | 'POST_PURCHASE'
  | 'PLAYER_PAUSE'
  | 'PRE_ROLL'
  | 'PLAYER_OVERLAY';

export type AdDestination =
  | { type: 'EVENT'; eventId: string }
  | { type: 'EXTERNAL_URL'; url: string };

export type AdPauseVariant = 'STANDARD' | 'FULLSCREEN';

/** Vitrine (PLAYER_OVERLAY). TOP/BOTTOM use format LOGO_4x1, SIDE uses LOGO_2x3. */
export type AdOverlayPosition = 'TOP' | 'BOTTOM' | 'SIDE';
export type AdOverlayAnimation = 'SLIDE' | 'FADE';
export type AdOverlayDurationSec = 5 | 8 | 10 | 15;

export interface AdOverlaySpec {
  position: AdOverlayPosition;
  animation: AdOverlayAnimation;
  durationSec: AdOverlayDurationSec;
}

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
  /** Vitrine layout; null for every placement other than PLAYER_OVERLAY. */
  overlay: AdOverlaySpec | null;
}

/**
 * GET /ads/serve/overlay?eventId=&sessionId=&watchedSec=
 * The player asks again after `retryAfterSec` whether or not it got an ad.
 * Impression beacon only after the logo is fully on screen for 2 s with the tab visible.
 */
export interface ServeOverlayResponse {
  ad: ServedAd | null;
  retryAfterSec: number;
}

/** Non-billable player beacons: POST /ads/serve/:servedId/event { type }. Idempotent per (servedId, type). */
export type AdServedEventType =
  | 'video_q25'
  | 'video_q50'
  | 'video_q75'
  | 'video_complete'
  | 'video_skip'
  | 'video_unmute'
  | 'pause_close'
  | 'overlay_complete';

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

export interface AdOverlayEventTotals {
  complete: number;
}

/** Live vs replay split of a report; live = total − replay. */
export interface AdModeTotals {
  live: { impressions: number; clicks: number };
  replay: { impressions: number; clicks: number };
}
