export type FeatureFlagKey =
  | 'chat'
  | 'two_factor'
  | 'vod_upload'
  | 'linear_channels'
  | 'mobile_stripe_checkout'
  | 'push_notifications'
  | 'play_billing';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
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
};
