import { describe, it, expect } from 'vitest';
import { ISO_CURRENCIES, DEFAULT_CURRENCY } from './currencies';

describe('ISO_CURRENCIES', () => {
  it('covers the full ISO 4217 set (not a shortlist)', () => {
    expect(ISO_CURRENCIES.length).toBeGreaterThan(100);
  });

  it('includes common codes', () => {
    const codes = ISO_CURRENCIES.map((c) => c.code);
    expect(codes).toEqual(
      expect.arrayContaining(['BRL', 'USD', 'EUR', 'JPY'])
    );
  });

  it('default currency is BRL and present in the list', () => {
    expect(DEFAULT_CURRENCY).toBe('BRL');
    expect(ISO_CURRENCIES.map((c) => c.code)).toContain('BRL');
  });
});
