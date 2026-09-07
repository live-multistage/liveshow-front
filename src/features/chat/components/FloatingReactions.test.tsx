import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { FloatingReactions } from './FloatingReactions';
import type { ReactionEmoji } from '../types/chat.types';

const ZERO_COUNTS: Record<ReactionEmoji, number> = {
  '💜': 0,
  '🔥': 0,
  '🤘': 0,
  '👏': 0,
  '✨': 0,
};

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  mockMatchMedia(false);
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('FloatingReactions', () => {
  it('spawns nothing on first render', () => {
    const { container } = render(<FloatingReactions counts={ZERO_COUNTS} />);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  it('spawns particles when a count increases, then removes them after the animation', () => {
    const { container, rerender } = render(<FloatingReactions counts={ZERO_COUNTS} />);

    rerender(<FloatingReactions counts={{ ...ZERO_COUNTS, '🔥': 3 }} />);
    expect(container.querySelectorAll('span')).toHaveLength(3);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  it('caps the number of live particles at ~40', () => {
    const { container, rerender } = render(<FloatingReactions counts={ZERO_COUNTS} />);

    rerender(<FloatingReactions counts={{ ...ZERO_COUNTS, '🔥': 50 }} />);
    // A single delta is itself capped per-emoji at 8, so stack multiple
    // increasing snapshots to push past the 40-particle live cap.
    rerender(<FloatingReactions counts={{ ...ZERO_COUNTS, '🔥': 50, '💜': 50 }} />);
    rerender(<FloatingReactions counts={{ ...ZERO_COUNTS, '🔥': 50, '💜': 50, '🤘': 50 }} />);
    rerender(<FloatingReactions counts={{ ...ZERO_COUNTS, '🔥': 50, '💜': 50, '🤘': 50, '👏': 50 }} />);
    rerender(
      <FloatingReactions
        counts={{ '🔥': 50, '💜': 50, '🤘': 50, '👏': 50, '✨': 50 }}
      />,
    );

    expect(container.querySelectorAll('span').length).toBeLessThanOrEqual(40);
  });

  it('renders nothing when the viewer prefers reduced motion', () => {
    mockMatchMedia(true);
    const { container, rerender } = render(<FloatingReactions counts={ZERO_COUNTS} />);
    rerender(<FloatingReactions counts={{ ...ZERO_COUNTS, '🔥': 3 }} />);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });
});
