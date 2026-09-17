import { test, expect } from 'vitest';
import { messages, LOCALES, DEFAULT_LOCALE, isLocale } from './index';

function keyPaths(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
}

test('all locales share the same key set', () => {
  const base = keyPaths(messages.pt).sort();
  for (const locale of LOCALES) {
    expect(keyPaths(messages[locale]).sort(), locale).toEqual(base);
  }
});

test('default locale is pt and isLocale narrows', () => {
  expect(DEFAULT_LOCALE).toBe('pt');
  expect(isLocale('en')).toBe(true);
  expect(isLocale('fr')).toBe(false);
  expect(isLocale(undefined)).toBe(false);
});

test('auth login keys exist', () => {
  expect(messages.pt.auth.login.submit).toBe('Entrar');
});

test('M2 player keys exist', () => {
  expect(messages.pt.player.noAccess.title).toBe('Acesso restrito');
  expect(messages.pt.ads.sponsored).toBe('Patrocinado');
});

test('M3b Play billing keys exist', () => {
  // Both CTAs name the amount — equal prominence includes the price.
  expect(messages.pt.checkout.play.payWithPlay).toBe('Pagar {amount} com Google Play');
  expect(messages.pt.checkout.play.payWithCard).toBe('Pagar {amount} com cartão');
  expect(messages.pt.checkout.errors.PURCHASE_PENDING).toContain('Google');
});

test('M5 social login keys exist', () => {
  expect(messages.pt.auth.social.continueWithApple).toBe('Continuar com Apple');
  expect(messages.pt.auth.social.errors.SOCIAL_LOGIN_DISABLED).toContain('disponível');
  expect(messages.pt.account.connectedWith).toBe('Conectado com {provider}');
});

test('organizers page keys exist', () => {
  expect(messages.pt.organizersPage.hero.cta).toBe('Quero transmitir meu evento');
  expect(messages.pt.nav.organizers).toBe('Seja um parceiro');
  expect(messages.pt.organizersPage.faq.items.length).toBe(8);
});

test('about page keys exist', () => {
  expect(messages.pt.aboutPage.meta.title).toBe('Sobre');
  expect(messages.pt.aboutPage.hero.manifesto.length).toBe(3);
  expect(messages.pt.aboutPage.cta.organizer.button).toBe('Seja um parceiro');
});

test('privacy policy declares what the platform actually does', () => {
  const privacy = messages.pt.legal.privacy;

  // Controller identification is filled in before publishing — the placeholders
  // must stay visible so nobody ships the policy with them still in place.
  expect(privacy.controller.body).toContain('[RAZÃO SOCIAL]');
  expect(privacy.controller.body).toContain('[CNPJ]');

  // Retention has to match UserEventsRetentionCron (180 days), not the old "12 meses".
  expect(privacy.retention.analytics).toContain('180');
  expect(privacy.retention.ads).toContain('7');

  // Facts the old page omitted entirely.
  expect(privacy.dataWeCollect.session).toContain('IP');
  expect(privacy.sharing.payments).toContain('Stripe');
  expect(privacy.sharing.fiscal).toContain('PlugNotas');
  expect(privacy.sharing.observability).toContain('Grafana');
  expect(privacy.dataWeCollect.cookies).toContain('carrinho');

  // Account deletion is a soft delete that keeps orders and invoices.
  expect(privacy.deletion.body).toContain('pedidos');

  expect(privacy.minors.body).toContain('16');
  expect(privacy.dpo.email).toBe('privacidade@showon.io');
});

test('terms cover age and point at the privacy policy', () => {
  expect(messages.pt.legal.terms.p5).toContain('16');
  expect(messages.pt.legal.terms.p6).toContain('Privacidade');
});

test('dateTimeInput keys exist', () => {
  expect(messages.pt.dateTimeInput.weekdays).toHaveLength(7);
  expect(messages.pt.dateTimeInput.invalidDate).toContain('dd/mm/aaaa');
  expect(messages.pt.createEvent.location.startsAtLabel).toBe('Início');
});
