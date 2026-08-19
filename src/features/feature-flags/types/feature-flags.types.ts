export type FeatureFlagKey = 'chat' | 'two_factor' | 'vod_upload';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  chat: false,
  two_factor: false,
  vod_upload: false,
};
