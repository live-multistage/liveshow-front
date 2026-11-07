// Advertiser-side types (CreateAdRequest, AdResponse, AdReviewEntry, etc.)
// moved to the external Ads Manager. Only the serve-side contract remains.
export type { AdPlacement, AdDestination, AdPauseVariant, ServedAd } from '@live-show/api-contracts';

// Eventos de engajamento (sem cobrança), idempotentes por (anúncio servido, tipo).
export type AdEventType =
  | 'video_q25'
  | 'video_q50'
  | 'video_q75'
  | 'video_complete'
  | 'video_skip'
  | 'video_unmute'
  | 'pause_close';
