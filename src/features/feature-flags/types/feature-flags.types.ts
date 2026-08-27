export type FeatureFlagKey = 'chat' | 'two_factor' | 'vod_upload' | 'linear_channels';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  chat: false,
  two_factor: false,
  vod_upload: false,
  // Ships on — gates channels, not a beta toggle.
  linear_channels: true,
};
