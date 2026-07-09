export type FeatureFlagKey = 'chat';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  chat: false,
};
