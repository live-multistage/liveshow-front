import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactionBar } from './ReactionBar';
import type { ReactionEmoji } from '../types/chat.types';

const ZERO_COUNTS: Record<ReactionEmoji, number> = {
  '💜': 0,
  '🔥': 0,
  '🤘': 0,
  '👏': 0,
  '✨': 0,
};

describe('ReactionBar', () => {
  it('hides the count for emojis with zero reactions', () => {
    render(<ReactionBar onReact={vi.fn()} counts={ZERO_COUNTS} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows the count for emojis with reactions, compacted above 1000', () => {
    render(<ReactionBar onReact={vi.fn()} counts={{ ...ZERO_COUNTS, '🔥': 12, '💜': 1500 }} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('1,5k')).toBeInTheDocument();
  });

  it('calls onReact with the clicked emoji', () => {
    const onReact = vi.fn();
    render(<ReactionBar onReact={onReact} counts={ZERO_COUNTS} />);
    fireEvent.click(screen.getByText('🔥'));
    expect(onReact).toHaveBeenCalledWith('🔥');
  });
});
