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
