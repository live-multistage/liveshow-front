import { describe, expect, it } from 'vitest';
import { FLAG_CATALOG, FLAG_GROUP_ORDER, flagMeta } from './flag-catalog';

describe('flagMeta', () => {
  it('returns the cataloged meta for a known key', () => {
    expect(flagMeta('mobile_stripe_checkout')).toEqual({
      group: 'payments',
      scope: 'viewers',
      risky: true,
    });
  });

  it('falls back to other/all for an unknown key', () => {
    expect(flagMeta('some_future_flag')).toEqual({ group: 'other', scope: 'all' });
  });

  it('marks play_billing as risky and beta, reserved scope', () => {
    expect(flagMeta('play_billing')).toEqual({
      group: 'payments',
      scope: 'reserved',
      risky: true,
      beta: true,
    });
  });

  it('catalogs exactly the 17 backend keys', () => {
    expect(Object.keys(FLAG_CATALOG).sort()).toEqual(
      [
        'chat',
        'linear_channels',
        'mobile_stripe_checkout',
        'play_billing',
        'push_notifications',
        'two_factor',
        'vod_upload',
        'ads_delivery',
        'ad_revenue_share',
        'organizer_applications',
        'artist_applications',
        'social_login',
        'low_latency_mode',
        'physical_tickets',
        'coupons',
        'event_collaborations',
        'fiscal_emission',
      ].sort(),
    );
  });

  it('marks exactly the risky keys from the spec', () => {
    const riskyKeys = Object.entries(FLAG_CATALOG)
      .filter(([, meta]) => meta.risky)
      .map(([key]) => key)
      .sort();
    expect(riskyKeys).toEqual(
      ['mobile_stripe_checkout', 'play_billing', 'ads_delivery', 'ad_revenue_share', 'coupons'].sort(),
    );
  });

  it('orders groups player, account, payments, other', () => {
    expect(FLAG_GROUP_ORDER).toEqual(['player', 'account', 'payments', 'other']);
  });
});
