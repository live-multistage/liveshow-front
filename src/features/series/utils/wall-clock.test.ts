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

  // A single offset-correction pass is wrong right at a DST boundary: the
  // offset measured at the naive first guess can differ from the offset at
  // the corrected instant (e.g. inside a spring-forward gap), so the guess
  // needs a second correction. These match the backend's
  // zonedWallClockToUtc (orchestrator series-schedule.ts) byte for byte —
  // computed by running that exact ported algorithm, not hand-picked.
  describe('DST transitions (matches backend zonedWallClockToUtc)', () => {
    it('America/New_York spring-forward gap — 02:30 (inside the skipped hour)', () => {
      // Clocks jump 02:00 EST -> 03:00 EDT on 2026-03-08; 02:30 never exists.
      expect(wallClockToUtcISOString('2026-03-08', '02:30', 'America/New_York')).toBe(
        '2026-03-08T06:30:00.000Z',
      );
    });

    it('America/New_York spring-forward gap — 03:30 (first valid instant after the jump)', () => {
      expect(wallClockToUtcISOString('2026-03-08', '03:30', 'America/New_York')).toBe(
        '2026-03-08T07:30:00.000Z',
      );
    });

    it('America/New_York fall-back — 01:30 (ambiguous, occurs twice)', () => {
      expect(wallClockToUtcISOString('2026-11-01', '01:30', 'America/New_York')).toBe(
        '2026-11-01T05:30:00.000Z',
      );
    });

    it('Europe/London spring-forward — 01:30 (before the jump)', () => {
      expect(wallClockToUtcISOString('2026-03-29', '01:30', 'Europe/London')).toBe(
        '2026-03-29T01:30:00.000Z',
      );
    });

    it('Europe/London fall-back — 01:30 (ambiguous, occurs twice)', () => {
      expect(wallClockToUtcISOString('2026-10-25', '01:30', 'Europe/London')).toBe(
        '2026-10-25T01:30:00.000Z',
      );
    });

    it('America/Sao_Paulo — no DST since 2019, plain fixed offset', () => {
      expect(wallClockToUtcISOString('2026-09-03', '20:00', 'America/Sao_Paulo')).toBe(
        '2026-09-03T23:00:00.000Z',
      );
    });
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
