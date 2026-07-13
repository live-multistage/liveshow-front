export type FeatureFlagKey = 'chat' | 'two_factor';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  chat: false,
  two_factor: false,
};
