import { describe, it, expect } from 'vitest';
import type { ReplayChapter } from '../types/live.types';
import { chapterDuration, chapterProgressPct, chapterTrackSegments, formatClock, pointerToMs } from './chapter-track';

const T0 = 1_000_000;
const MIN = 60_000;
const timeline = { startsAtMs: T0, endsAtMs: T0 + 120 * MIN }; // a 2-hour replay

const chapter = (id: string, startMs: number, endMs: number): ReplayChapter => ({
  id,
  stageId: null,
  startsAtMs: T0 + startMs,
  endsAtMs: T0 + endMs,
  title: id,
  description: null,
  artists: [],
});

describe('chapterTrackSegments', () => {
  it('covers the timeline edge to edge, with neutral segments where no chapter is', () => {
    const segments = chapterTrackSegments([chapter('a', 0, 12 * MIN), chapter('b', 15 * MIN, 20 * MIN)], timeline, T0);
    expect(segments.map((s) => [s.chapterId, s.startsAtMs - T0, s.endsAtMs - T0])).toEqual([
      ['a', 0, 12 * MIN],
      [null, 12 * MIN, 15 * MIN],
      ['b', 15 * MIN, 20 * MIN],
      [null, 20 * MIN, 120 * MIN],
    ]);
    expect(segments.map((s) => s.last)).toEqual([false, false, false, true]);
  });

  it('places each segment as a percentage of the timeline', () => {
    const [a, rest] = chapterTrackSegments([chapter('a', 0, 12 * MIN)], timeline, T0);
    expect(a.leftPct).toBe(0);
    expect(a.widthPct).toBeCloseTo(10);
    expect(rest.leftPct).toBeCloseTo(10);
    expect(rest.widthPct).toBeCloseTo(90);
  });

  it('fills played segments fully, the current one partly and later ones not at all', () => {
    const segments = chapterTrackSegments([chapter('a', 0, 12 * MIN), chapter('b', 12 * MIN, 24 * MIN)], timeline, T0 + 18 * MIN);
    expect(segments.map((s) => Math.round(s.fillPct))).toEqual([100, 50, 0]);
  });

  it('keeps a 40-second chapter in a 2-hour replay as its own segment', () => {
    const segments = chapterTrackSegments([chapter('short', 40 * MIN, 40 * MIN + 40_000)], timeline, T0);
    const short = segments.find((s) => s.chapterId === 'short')!;
    expect(short.widthPct).toBeGreaterThan(0);
    expect(short.widthPct).toBeLessThan(1);
  });

  it('returns nothing without chapters or with an empty timeline', () => {
    expect(chapterTrackSegments([], timeline, T0)).toEqual([]);
    expect(chapterTrackSegments([chapter('a', 0, MIN)], { startsAtMs: T0, endsAtMs: T0 }, T0)).toEqual([]);
  });
});

describe('formatClock', () => {
  it('shows hours when the replay lasts an hour or more', () => {
    expect(formatClock(20 * MIN, 120 * MIN)).toBe('0:20:00');
    expect(formatClock(5_400_000 + 7_000, 120 * MIN)).toBe('1:30:07');
  });

  it('shows minutes and seconds for a replay under an hour', () => {
    expect(formatClock(754_000, 30 * MIN)).toBe('12:34');
  });

  it('clamps negative offsets to zero', () => {
    expect(formatClock(-5, 120 * MIN)).toBe('0:00:00');
  });
});

describe('chapterDuration', () => {
  it('reads whole minutes from a minute up', () => {
    expect(chapterDuration(20 * MIN)).toEqual({ unit: 'min', count: 20 });
    expect(chapterDuration(14 * MIN + 31_000)).toEqual({ unit: 'min', count: 15 });
  });

  it('reads seconds under a minute', () => {
    expect(chapterDuration(40_000)).toEqual({ unit: 's', count: 40 });
  });
});

describe('chapterProgressPct', () => {
  it('is the share of the chapter already played, clamped to 0..100', () => {
    const c = { startsAtMs: 1000, endsAtMs: 3000 };
    expect(chapterProgressPct(c, 2000)).toBe(50);
    expect(chapterProgressPct(c, 0)).toBe(0);
    expect(chapterProgressPct(c, 9000)).toBe(100);
  });
});

describe('pointerToMs', () => {
  it('maps the pointer x inside the track onto the timeline', () => {
    expect(pointerToMs(250, 0, 1000, 0, 4000)).toBe(1000);
    expect(pointerToMs(150, 100, 200, 1000, 3000)).toBe(1500);
  });

  it('clamps outside the track and survives a zero-width track', () => {
    expect(pointerToMs(-10, 0, 1000, 0, 4000)).toBe(0);
    expect(pointerToMs(2000, 0, 1000, 0, 4000)).toBe(4000);
    expect(pointerToMs(5, 0, 0, 100, 200)).toBe(100);
  });
});
