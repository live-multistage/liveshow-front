import { describe, it, expect } from 'vitest';
import { wallClockToUtcISOString, utcInstantToWallClock } from './wall-clock';

describe('wallClockToUtcISOString', () => {
  it('converts a wall-clock date/time in a UTC-negative timezone to the right UTC instant', () => {
    // 2026-09-03 20:00 in America/Sao_Paulo (UTC-3, no DST) is 23:00 UTC.
    const iso = wallClockToUtcISOString('2026-09-03', '20:00', 'America/Sao_Paulo');
    expect(iso).toBe('2026-09-03T23:00:00.000Z');
  });

  it('converts a wall-clock date/time in a UTC-positive timezone', () => {
    // 2026-09-03 09:00 in Asia/Tokyo (UTC+9) is the previous day 00:00 UTC.
    const iso = wallClockToUtcISOString('2026-09-03', '09:00', 'Asia/Tokyo');
    expect(iso).toBe('2026-09-03T00:00:00.000Z');
  });

  it('round-trips through UTC itself', () => {
    const iso = wallClockToUtcISOString('2026-01-15', '14:30', 'UTC');
    expect(iso).toBe('2026-01-15T14:30:00.000Z');
  });
});

describe('utcInstantToWallClock', () => {
  it('reads back the same wall clock the instant was built from', () => {
    expect(utcInstantToWallClock('2026-09-03T23:00:00.000Z', 'America/Sao_Paulo')).toEqual({
      date: '2026-09-03',
      time: '20:00',
    });
  });

  it('is the exact inverse of wallClockToUtcISOString', () => {
    const iso = wallClockToUtcISOString('2026-09-03', '09:00', 'Asia/Tokyo');
    expect(utcInstantToWallClock(iso, 'Asia/Tokyo')).toEqual({
      date: '2026-09-03',
      time: '09:00',
    });
  });
});
