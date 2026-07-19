// Advertiser-side types (CreateAdRequest, AdResponse, AdReviewEntry, etc.)
// moved to the external Ads Manager. Only the serve-side contract remains.
export type AdPlacement = 'FEED' | 'EVENT_DETAIL' | 'CHECKOUT' | 'POST_PURCHASE';

export type AdDestination =
  | { type: 'EVENT'; eventId: string }
  | { type: 'EXTERNAL_URL'; url: string };

export interface ServedAd {
  adId: string;
  title: string;
  format: string;
  advertiserAccountId: string;
  destination: AdDestination | null;
  bannerUrl: string | null;
}
