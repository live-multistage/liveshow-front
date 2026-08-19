import { describe, expect, it } from 'vitest';

import {
  absoluteToLocal,
  coverageAt,
  localToAbsolute,
  type ReplaySegmentCoverage,
} from './replay-timeline';

// Single 10s stretch: absolute [0, 10000) -> local [0, 10).
const single: ReplaySegmentCoverage[] = [{ startsAtMs: 0, endsAtMs: 10_000, localStartSec: 0 }];

// Two 10s stretches with a 10s wall-clock gap between them (camera dropped
// and reconnected). The gap never appears on the local timeline: stretch B
// picks up local time exactly where stretch A left off.
const withGap: ReplaySegmentCoverage[] = [
  { startsAtMs: 0, endsAtMs: 10_000, localStartSec: 0 },
  { startsAtMs: 20_000, endsAtMs: 30_000, localStartSec: 10 },
];

describe('coverageAt', () => {
  it('finds the stretch containing an instant inside it', () => {
    expect(coverageAt(single, 5_000)).toBe(single[0]);
  });

  it('start boundary is inclusive', () => {
    expect(coverageAt(single, 0)).toBe(single[0]);
  });

  it('end boundary is inclusive only for the last stretch', () => {
    // single stretch: its endsAtMs is also the last stretch's end, so inclusive.
    expect(coverageAt(single, 10_000)).toBe(single[0]);
  });

  it('non-last stretch end boundary is exclusive', () => {
    expect(coverageAt(withGap, 10_000)).toBeNull();
  });

  it('returns null before the first stretch', () => {
    expect(coverageAt(single, -1)).toBeNull();
  });

  it('returns null after the last stretch', () => {
    expect(coverageAt(single, 10_001)).toBeNull();
  });

  it('returns null for an instant inside the gap between stretches', () => {
    expect(coverageAt(withGap, 15_000)).toBeNull();
  });

  it('returns null for everything on empty coverage', () => {
    expect(coverageAt([], 0)).toBeNull();
  });
});

describe('absoluteToLocal', () => {
  it('maps an instant inside a single stretch', () => {
    expect(absoluteToLocal(single, 5_000)).toBe(5);
  });

  it('maps the exact start of a stretch', () => {
    expect(absoluteToLocal(single, 0)).toBe(0);
  });

  it('maps the exact end of the last stretch', () => {
    expect(absoluteToLocal(single, 10_000)).toBe(10);
  });

  it('returns null before coverage starts', () => {
    expect(absoluteToLocal(single, -1)).toBeNull();
  });

  it('returns null after coverage ends', () => {
    expect(absoluteToLocal(single, 10_001)).toBeNull();
  });

  it('returns null for an instant in the gap between two stretches', () => {
    expect(absoluteToLocal(withGap, 15_000)).toBeNull();
  });

  it('an instant in the second stretch skips the gap on the local timeline', () => {
    // Absolute 25s is 25s after t=0, but only 15s of that was ever recorded
    // (10s of stretch A + 5s into stretch B) — the 10s gap must not count.
    expect(absoluteToLocal(withGap, 25_000)).toBe(15);
  });

  it('returns null for empty coverage', () => {
    expect(absoluteToLocal([], 0)).toBeNull();
  });
});

describe('localToAbsolute', () => {
  it('round-trips with absoluteToLocal on the first stretch', () => {
    const atMs = 5_000;
    const localSec = absoluteToLocal(withGap, atMs);
    expect(localSec).not.toBeNull();
    expect(localToAbsolute(withGap, localSec as number)).toBe(atMs);
  });

  it('round-trips with absoluteToLocal on the second stretch', () => {
    const atMs = 25_000;
    const localSec = absoluteToLocal(withGap, atMs);
    expect(localSec).not.toBeNull();
    expect(localToAbsolute(withGap, localSec as number)).toBe(atMs);
  });

  it('returns null beyond the last stretch', () => {
    expect(localToAbsolute(withGap, 20.001)).toBeNull();
  });

  it('returns null for empty coverage', () => {
    expect(localToAbsolute([], 0)).toBeNull();
  });
});
