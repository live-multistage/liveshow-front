import { describe, it, expect } from 'vitest';
import { dominantSale, sumByCurrency, formatMoney } from './org-stats';

describe('org-stats', () => {
  it('dominantSale picks the largest-amount currency bucket', () => {
    expect(dominantSale([{ currency: 'BRL', amount: 50 }, { currency: 'USD', amount: 80 }]))
      .toEqual({ currency: 'USD', amount: 80 });
  });
  it('dominantSale returns null for empty/undefined', () => {
    expect(dominantSale([])).toBeNull();
    expect(dominantSale(undefined)).toBeNull();
  });
  it('sumByCurrency sums only the requested currency across orgs', () => {
    const orgs = [
      { salesThisMonth: [{ currency: 'BRL', amount: 100 }, { currency: 'USD', amount: 999 }] },
      { salesThisMonth: [{ currency: 'BRL', amount: 50 }] },
      { salesThisMonth: undefined },
    ];
    expect(sumByCurrency(orgs, 'BRL')).toBe(150);
  });
  it('formatMoney formats with the given currency', () => {
    expect(formatMoney(1234.5, 'BRL')).toContain('1.234,5'); // pt-BR grouping
  });
});
