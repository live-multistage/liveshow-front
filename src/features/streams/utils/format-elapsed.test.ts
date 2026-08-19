import { describe, it, expect } from 'vitest';
import { formatElapsed } from './format-elapsed';

const t0 = Date.parse('2026-07-18T10:00:00Z');

describe('formatElapsed', () => {
  it('returns a dash when nothing is on air (never counts from page open)', () => {
    expect(formatElapsed(null, t0)).toBe('—');
    expect(formatElapsed(undefined, t0)).toBe('—');
  });

  it('counts from the real on-air start, not from now', () => {
    expect(formatElapsed('2026-07-18T10:00:00Z', t0 + 90_000)).toBe('00:01:30');
    expect(formatElapsed('2026-07-18T10:00:00Z', t0 + 3_661_000)).toBe('01:01:01');
  });

  it('shows zero the instant a camera goes on air', () => {
    expect(formatElapsed('2026-07-18T10:00:00Z', t0)).toBe('00:00:00');
  });

  it('clamps clock skew (start slightly ahead of client now) to zero', () => {
    expect(formatElapsed('2026-07-18T10:00:05Z', t0)).toBe('00:00:00');
  });

  it('returns a dash for an unparseable timestamp', () => {
    expect(formatElapsed('not-a-date', t0)).toBe('—');
  });
});
