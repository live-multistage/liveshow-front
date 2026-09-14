import { describe, it, expect, vi } from 'vitest';
import { liveScrubber, formatBehind, formatTime } from './live-scrubber';
import type { DvrState } from '../TransportBar';

const dvrAt = (position: number): DvrState => ({ start: 0, end: 3606, position, edge: 3600, tolerance: 6 });

describe('liveScrubber', () => {
  it('maps the DVR window onto the scrubber with a behind-the-edge label', () => {
    const onSeek = vi.fn();
    expect(liveScrubber(dvrAt(3517), onSeek, true)).toEqual({
      min: 0, max: 3606, value: 3517, onSeek, leadingLabel: '-1:23',
    });
  });

  it('is hidden before any position has been reported', () => {
    expect(liveScrubber(null, vi.fn(), true)).toBeNull();
  });

  it('is hidden while the window is only the player buffer (no real DVR)', () => {
    expect(liveScrubber({ start: 100, end: 112, position: 106, edge: 106, tolerance: 6 }, vi.fn(), true)).toBeNull();
  });

  it('is hidden when nothing can act on a seek', () => {
    expect(liveScrubber(dvrAt(1200), undefined, true)).toBeNull();
  });

  it('is hidden for a channel (showPlayback=false) even with a seekable window', () => {
    expect(liveScrubber(dvrAt(1200), vi.fn(), false)).toBeNull();
  });
});

describe('time labels', () => {
  it('formatBehind clamps at zero and pads seconds', () => {
    expect(formatBehind(83)).toBe('-1:23');
    expect(formatBehind(-4)).toBe('-0:00');
  });
  it('formatTime handles non-finite input', () => {
    expect(formatTime(725)).toBe('12:05');
    expect(formatTime(NaN)).toBe('0:00');
  });
});
