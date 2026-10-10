import { describe, it, expect } from 'vitest';
import { formatDate, formatDateShort, formatPrice, formatTime } from './event-formatters';

describe('formatPrice', () => {
  it('formats in the given currency', () => {
    expect(formatPrice(100, 'USD')).toContain('US$'); // pt-BR renders USD as "US$"
  });

  it('defaults to BRL', () => {
    expect(formatPrice(100)).toContain('R$');
  });

  it('accepts a locale override, defaulting to pt-BR', () => {
    expect(formatPrice(100, 'USD', 'en-US')).toContain('$');
    expect(formatPrice(100, 'BRL')).toContain('R$');
  });
});

describe('event date/time formatting', () => {
  // Server renders in UTC, the browser in the viewer's zone; both must agree (#418).
  const iso = '2026-09-27T02:41:00Z'; // 23:41 on the 26th in São Paulo

  it('formats the time in the event time zone', () => {
    expect(formatTime(iso)).toBe('23:41');
  });

  it('formats the date in the event time zone', () => {
    expect(formatDateShort(iso)).toMatch(/\b26 de/);
    expect(formatDate(iso)).toMatch(/\b26 de/);
  });
});
