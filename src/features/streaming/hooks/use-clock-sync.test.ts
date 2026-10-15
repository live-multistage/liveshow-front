import { describe, it, expect } from 'vitest';
import { resolveClockCorrection } from './use-clock-sync';

describe('resolveClockCorrection', () => {
  it('leaves followers alone within half a frame (±20ms)', () => {
    expect(resolveClockCorrection(0)).toEqual({ type: 'none' });
    expect(resolveClockCorrection(0.015)).toEqual({ type: 'none' });
    expect(resolveClockCorrection(-0.02)).toEqual({ type: 'none' });
  });

  it('nudges in proportion to the drift, at least 1%', () => {
    expect(resolveClockCorrection(0.03)).toEqual({ type: 'rate', rate: 1.015 });
    expect(resolveClockCorrection(-0.06)).toEqual({ type: 'rate', rate: 0.97 });
    expect(resolveClockCorrection(0.021)).toEqual({ type: 'rate', rate: 1.0105 });
  });

  it('never moves past the dead zone between two checks (0.5s)', () => {
    for (const drift of [0.025, 0.04, 0.08, 0.2, 1]) {
      const c = resolveClockCorrection(drift);
      if (c.type !== 'rate') throw new Error('expected a rate nudge');
      expect(drift - (c.rate - 1) * 0.5).toBeGreaterThan(-0.02);
    }
  });

  it('speeds up a follower that is behind the master', () => {
    expect(resolveClockCorrection(0.5)).toEqual({ type: 'rate', rate: 1.05 });
  });

  it('slows down a follower that is ahead of the master', () => {
    expect(resolveClockCorrection(-0.5)).toEqual({ type: 'rate', rate: 0.95 });
  });

  it('hard-seeks past the nudge range (±1.5s), both directions', () => {
    expect(resolveClockCorrection(2)).toEqual({ type: 'seek' });
    expect(resolveClockCorrection(-3)).toEqual({ type: 'seek' });
    expect(resolveClockCorrection(1.5)).toEqual({ type: 'seek' });
  });
});
