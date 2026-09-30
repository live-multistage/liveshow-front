import { describe, it, expect } from 'vitest';
import { isRangeValid, rangeDays, toReportRangeBounds } from './report-utils';

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
