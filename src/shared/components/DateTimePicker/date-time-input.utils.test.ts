import { describe, it, expect } from 'vitest';
import {
  maskDate,
  maskTime,
  parseDate,
  normalizeTime,
  formatDate,
  combine,
  toDateTimeLocal,
  fromDateTimeLocal,
  buildMonthGrid,
} from './date-time-input.utils';

describe('maskDate', () => {
  it('inserts slashes as digits accumulate', () => {
    expect(maskDate('21')).toBe('21');
    expect(maskDate('2109')).toBe('21/09');
    expect(maskDate('21092026')).toBe('21/09/2026');
  });

  it('ignores non-digits and caps at 8 digits', () => {
    expect(maskDate('21/09/2026extra')).toBe('21/09/2026');
  });
});

describe('maskTime', () => {
  it('inserts colon after 2 digits', () => {
    expect(maskTime('9')).toBe('9');
    expect(maskTime('2000')).toBe('20:00');
  });
});

describe('parseDate', () => {
  it('rejects an invalid calendar date (31/02)', () => {
    expect(parseDate('31022026')).toBeNull();
  });

  it('accepts a 2-digit year as 20xx', () => {
    const parsed = parseDate('210926');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(8);
    expect(parsed?.getDate()).toBe(21);
  });

  it('accepts a full 4-digit year', () => {
    const parsed = parseDate('21092026');
    expect(parsed?.toDateString()).toBe(new Date(2026, 8, 21).toDateString());
  });

  it('returns null for incomplete input', () => {
    expect(parseDate('2109')).toBeNull();
  });
});

describe('normalizeTime', () => {
  it('returns empty string for cleared input', () => {
    expect(normalizeTime('')).toBe('');
  });

  it('pads a single digit hour to HH:00', () => {
    expect(normalizeTime('9')).toBe('09:00');
  });

  it('rejects an out-of-range time', () => {
    expect(normalizeTime('2460')).toBeNull();
  });

  it('normalizes a full valid time', () => {
    expect(normalizeTime('2000')).toBe('20:00');
  });
});

describe('formatDate / combine / datetime-local roundtrip', () => {
  it('formats a date as dd/mm/yyyy', () => {
    expect(formatDate(new Date(2026, 8, 21))).toBe('21/09/2026');
  });

  it('combines a date and time into one Date', () => {
    const combined = combine(new Date(2026, 8, 21), '20:00');
    expect(combined?.getHours()).toBe(20);
    expect(combined?.getMinutes()).toBe(0);
  });

  it('returns null when date or time is missing', () => {
    expect(combine(null, '20:00')).toBeNull();
    expect(combine(new Date(2026, 8, 21), '')).toBeNull();
  });

  it('roundtrips through toDateTimeLocal/fromDateTimeLocal', () => {
    const value = toDateTimeLocal(new Date(2026, 8, 21, 20, 0));
    expect(value).toBe('2026-09-21T20:00');
    const { date, time } = fromDateTimeLocal(value);
    expect(time).toBe('20:00');
    expect(date?.toDateString()).toBe(new Date(2026, 8, 21).toDateString());
  });

  it('fromDateTimeLocal handles the unset value', () => {
    expect(fromDateTimeLocal('')).toEqual({ date: null, time: '' });
  });
});

describe('buildMonthGrid', () => {
  it('builds 5 rows for September 2026 (starts on Tuesday)', () => {
    const view = new Date(2026, 8, 1);
    const today = new Date(2026, 8, 1);
    const minDate = new Date(2026, 8, 5);
    const grid = buildMonthGrid(view, { selected: null, today, minDate });

    expect(grid).toHaveLength(35);
    expect(grid[0].date.toDateString()).toBe(new Date(2026, 7, 30).toDateString());
    expect(grid[0].inMonth).toBe(false);
    expect(grid[0].disabled).toBe(true);

    const sept5 = grid.find((cell) => cell.date.getDate() === 5 && cell.inMonth);
    expect(sept5?.disabled).toBe(false);

    const sept4 = grid.find((cell) => cell.date.getDate() === 4 && cell.inMonth);
    expect(sept4?.disabled).toBe(true);

    expect(grid.find((cell) => cell.isToday)?.date.toDateString()).toBe(today.toDateString());
  });
});
