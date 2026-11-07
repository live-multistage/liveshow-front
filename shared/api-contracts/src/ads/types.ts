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
