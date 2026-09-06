export type FeatureFlagKey =
  | 'chat'
  | 'two_factor'
  | 'vod_upload'
  | 'linear_channels'
  | 'mobile_stripe_checkout'
  | 'push_notifications'
  | 'play_billing'
  | 'ads_delivery'
  | 'ad_revenue_share'
  | 'organizer_applications'
  | 'social_login'
  | 'low_latency_mode'
  | 'coupons'
  | 'physical_tickets'
  | 'event_collaborations'
  | 'fiscal_emission';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS = {
  chat: false,
  two_factor: false,
  vod_upload: false,
  // Ships on — gates channels, not a beta toggle.
  linear_channels: true,
  // Ships off — thrown per app-store approval.
  mobile_stripe_checkout: false,
  // Ships off — switched on once EAS carries real FCM v1 + APNs credentials.
  push_notifications: false,
  // Ships off — switched on per Play Console readiness (SKUs synced, service
  // account authorised, user-choice enrolment approved).
  play_billing: false,
  // Ships on — seeded ON; kill switch for pre-roll/pause ad delivery.
  ads_delivery: true,
  // Ships on — seeded ON; kill switch for the ad partner revenue share program.
  ad_revenue_share: true,
  // Ships on — seeded ON; public organizer applications form stays open.
  organizer_applications: true,
  // Ships on — seeded ON; Google/Apple login buttons stay visible.
  social_login: true,
  // Ships on — seeded ON; LL-HLS option stays available, org-scoped rollout.
  low_latency_mode: true,
  // Ships on — seeded ON; coupon creation/validation/apply stays available.
  coupons: true,
  // Ships off — beta, enabled per organization on demand.
  physical_tickets: false,
  // Ships off — beta, enabled per organization on demand.
  event_collaborations: false,
  // Ships off — fiscal document emission via PlugNotas.
  fiscal_emission: false,
} satisfies Record<FeatureFlagKey, boolean>;
