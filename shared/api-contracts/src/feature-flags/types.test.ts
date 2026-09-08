import { test, expect } from 'vitest';
import { DEFAULT_FEATURE_FLAGS } from './types';
import type { FeatureFlagKey } from './types';

const ALL_KEYS: FeatureFlagKey[] = [
  'chat',
  'two_factor',
  'vod_upload',
  'linear_channels',
  'mobile_stripe_checkout',
  'push_notifications',
  'play_billing',
  'ads_delivery',
  'ad_revenue_share',
  'organizer_applications',
  'artist_applications',
  'social_login',
  'low_latency_mode',
  'coupons',
  'physical_tickets',
  'event_collaborations',
  'fiscal_emission',
];

test('DEFAULT_FEATURE_FLAGS covers every FeatureFlagKey', () => {
  expect(Object.keys(DEFAULT_FEATURE_FLAGS).sort()).toEqual([...ALL_KEYS].sort());
});

test('the six newly seeded flags default to true, the two beta flags default to false', () => {
  expect(DEFAULT_FEATURE_FLAGS.ads_delivery).toBe(true);
  expect(DEFAULT_FEATURE_FLAGS.ad_revenue_share).toBe(true);
  expect(DEFAULT_FEATURE_FLAGS.organizer_applications).toBe(true);
  expect(DEFAULT_FEATURE_FLAGS.social_login).toBe(true);
  expect(DEFAULT_FEATURE_FLAGS.low_latency_mode).toBe(true);
  expect(DEFAULT_FEATURE_FLAGS.coupons).toBe(true);
  expect(DEFAULT_FEATURE_FLAGS.physical_tickets).toBe(false);
  expect(DEFAULT_FEATURE_FLAGS.event_collaborations).toBe(false);
});
