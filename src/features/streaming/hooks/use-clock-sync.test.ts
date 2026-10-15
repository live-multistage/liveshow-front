import { describe, it, expect } from 'vitest';
import { resolveClockCorrection } from './use-clock-sync';

describe('resolveClockCorrection', () => {
  it('leaves followers alone within one frame (±40ms)', () => {
    expect(resolveClockCorrection(0)).toEqual({ type: 'none' });
    expect(resolveClockCorrection(0.03)).toEqual({ type: 'none' });
    expect(resolveClockCorrection(-0.04)).toEqual({ type: 'none' });
  });

  it('corrects a follower two frames off', () => {
    expect(resolveClockCorrection(0.08)).toEqual({ type: 'rate', rate: 1.05 });
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
