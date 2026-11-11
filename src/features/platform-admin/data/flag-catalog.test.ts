import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

  it('catalogs exactly the 19 backend keys', () => {
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
        'ads_overlay',
        'organizer_applications',
        'artist_applications',
        'social_login',
        'low_latency_mode',
        'physical_tickets',
        'coupons',
        'event_collaborations',
        'fiscal_emission',
        'mailing',
      ].sort(),
    );
  });

  it('marks exactly the risky keys from the spec', () => {
    const riskyKeys = Object.entries(FLAG_CATALOG)
      .filter(([, meta]) => meta.risky)
      .map(([key]) => key)
      .sort();
    expect(riskyKeys).toEqual(
      ['mobile_stripe_checkout', 'play_billing', 'ads_delivery', 'ads_overlay', 'ad_revenue_share', 'coupons'].sort(),
    );
  });

  it('orders groups player, account, payments, other', () => {
    expect(FLAG_GROUP_ORDER).toEqual(['player', 'account', 'payments', 'other']);
  });
});

// A tela de flags mostra nome e descrição vindos das mensagens; sem eles aparece a chave crua.
describe('ads_overlay label', () => {
  const messages = (lang: string) =>
    JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../shared/i18n-messages', `${lang}.json`), 'utf8'));

  it('is a payments flag, risky like ads_delivery (turning it on starts showing ads)', () => {
    expect(flagMeta('ads_overlay')).toEqual({ group: 'payments', scope: 'all', risky: true });
  });

  it('has a PT-BR name and description, like the other flags', () => {
    const flag = messages('pt').platformAdmin.featureFlags.ads_overlay;
    expect(flag.name).toBe('Vitrine no player');
    expect(flag.description).toBe(
      'Logo animada do anunciante sobre o player; kill switch próprio, além da entrega de anúncios.',
    );
  });

  it.each(['en', 'es'])('has a %s label too', (lang) => {
    const flag = messages(lang).platformAdmin.featureFlags.ads_overlay;
    expect(flag.name).toBeTruthy();
    expect(flag.description).toBeTruthy();
  });
});
