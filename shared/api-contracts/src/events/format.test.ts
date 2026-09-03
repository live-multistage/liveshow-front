import { test, expect } from 'vitest';
import { formatPrice, formatPriceRangeCents, formatDuration, formatEventTime } from './format';

test('formatPrice pt-BR BRL', () => {
  expect(formatPrice(49.9).replace(/ /g, ' ')).toBe('R$ 49,90');
});
test('formatPriceRangeCents', () => {
  const n = (s: string) => s.replace(/ /g, ' ');
  expect(formatPriceRangeCents(null, { freeLabel: 'Grátis' })).toBe('Grátis');
  expect(formatPriceRangeCents({ fromCents: 0, toCents: 0 }, { freeLabel: 'Grátis' })).toBe('Grátis');
  expect(n(formatPriceRangeCents({ fromCents: 1000, toCents: 1000 }))).toBe('R$ 10,00');
  expect(n(formatPriceRangeCents({ fromCents: 0, toCents: 1000 }, { freeLabel: 'Grátis' }))).toBe('Grátis – R$ 10,00');
  expect(n(formatPriceRangeCents({ fromCents: 1000, toCents: 5000 }))).toBe('R$ 10,00 – R$ 50,00');
});
test('formatDuration', () => {
  expect(formatDuration('2026-01-01T20:00:00Z', '2026-01-01T22:30:00Z')).toBe('2h 30min');
  expect(formatDuration('2026-01-01T20:00:00Z', '2026-01-01T21:00:00Z')).toBe('1h');
  expect(formatDuration('2026-01-01T22:00:00Z', '2026-01-01T20:00:00Z')).toBe('0h');
});
test('formatEventTime is HH:mm', () => {
  expect(formatEventTime('2026-01-01T20:05:00Z', 'pt-BR')).toMatch(/^\d{2}:\d{2}$/);
});
