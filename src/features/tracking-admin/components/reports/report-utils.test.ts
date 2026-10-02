import { describe, it, expect } from 'vitest';
import { isRangeValid, isValidAnchor, parsePathsParams, rangeDays, toReportRangeBounds } from './report-utils';

describe('rangeDays', () => {
  it('counts a single day pick as 1 (inclusive)', () => {
    expect(rangeDays('2026-09-30', '2026-09-30')).toBe(1);
  });

  it('counts a 90-day inclusive pick as 90', () => {
    expect(rangeDays('2026-01-01', '2026-03-31')).toBe(90);
  });

  it('returns 0 for empty inputs', () => {
    expect(rangeDays('', '')).toBe(0);
  });
});

describe('isRangeValid', () => {
  it('accepts a single-day pick', () => {
    expect(isRangeValid('2026-09-30', '2026-09-30')).toBe(true);
  });

  it('accepts an inclusive 90-day pick (the backend cap)', () => {
    expect(isRangeValid('2026-01-01', '2026-03-31')).toBe(true);
  });

  it('honors a custom maximum', () => {
    expect(isRangeValid('2026-09-01', '2026-10-01', 31)).toBe(true);
    expect(isRangeValid('2026-09-01', '2026-10-02', 31)).toBe(false);
    expect(isRangeValid('2026-09-01', '2026-10-02')).toBe(true);
  });

  it('rejects an inclusive 91-day pick', () => {
    expect(isRangeValid('2026-01-01', '2026-04-01')).toBe(false);
  });

  it('rejects `to` before `from`', () => {
    expect(isRangeValid('2026-09-30', '2026-09-29')).toBe(false);
  });
});

describe('toReportRangeBounds', () => {
  it('makes the end day inclusive by bounding at the next day midnight', () => {
    expect(toReportRangeBounds('2026-09-01', '2026-09-30')).toEqual({
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-10-01T00:00:00.000Z',
    });
  });

  it('a single-day pick still spans the whole end day', () => {
    expect(toReportRangeBounds('2026-09-30', '2026-09-30')).toEqual({
      from: '2026-09-30T00:00:00.000Z',
      to: '2026-10-01T00:00:00.000Z',
    });
  });
});

describe('isValidAnchor', () => {
  it('accepts event names and real-world page paths', () => {
    expect(isValidAnchor('checkout_started')).toBe(true);
    expect(isValidAnchor('page:/events/:id')).toBe(true);
    expect(isValidAnchor('page:/busca/caf%C3%A9')).toBe(true);
    expect(isValidAnchor('page:/a,b=c')).toBe(true);
  });

  it('rejects whitespace, a missing slash and over-long routes', () => {
    expect(isValidAnchor('page:/has space')).toBe(false);
    expect(isValidAnchor('page:events')).toBe(false);
    expect(isValidAnchor(`page:/${'a'.repeat(200)}`)).toBe(false);
    expect(isValidAnchor(`page:/${'a'.repeat(199)}`)).toBe(true);
  });
});

describe('parsePathsParams', () => {
  const valid = { anchor: 'checkout_started', direction: 'both', steps: '2', from: '2026-09-01', to: '2026-09-20' };
  const parse = (over: Record<string, string> = {}) =>
    parsePathsParams(new URLSearchParams({ ...valid, ...over }));

  it('restores a valid query', () => {
    expect(parse()).toEqual({ anchor: 'checkout_started', direction: 'both', steps: 2, from: '2026-09-01', to: '2026-09-20' });
  });

  it.each([
    ['bad anchor', { anchor: 'x y' }],
    ['bad direction', { direction: 'sideways' }],
    ['steps out of range', { steps: '9' }],
    ['non-numeric steps', { steps: 'abc' }],
    ['non date-only from', { from: '2026-09-01T00:00:00Z' }],
    ['range over 31 days', { from: '2026-08-01' }],
    ['inverted range', { from: '2026-09-25' }],
  ])('returns null for %s', (_, over) => {
    expect(parse(over)).toBeNull();
  });

  it('returns null when a param is missing', () => {
    expect(parsePathsParams(new URLSearchParams({ anchor: 'a_b' }))).toBeNull();
  });
});
