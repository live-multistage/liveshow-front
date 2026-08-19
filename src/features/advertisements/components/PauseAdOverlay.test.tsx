import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PauseAdOverlay } from './PauseAdOverlay';

vi.mock('./AdBanner', () => ({
  AdBanner: () => <div data-testid="ad-banner" />,
}));

describe('PauseAdOverlay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows nothing while playing', () => {
    render(<PauseAdOverlay paused={false} />);
    expect(screen.queryByTestId('ad-banner')).toBeNull();
  });

  it('shows nothing when mounted already paused (replay initial state)', () => {
    render(<PauseAdOverlay paused={true} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByTestId('ad-banner')).toBeNull();
  });

  it('shows the ad 2s after a pause transition, not before', () => {
    const { rerender } = render(<PauseAdOverlay paused={false} />);
    rerender(<PauseAdOverlay paused={true} />);
    act(() => vi.advanceTimersByTime(1999));
    expect(screen.queryByTestId('ad-banner')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('ad-banner')).toBeInTheDocument();
  });

  it('hides immediately on resume', () => {
    const { rerender } = render(<PauseAdOverlay paused={false} />);
    rerender(<PauseAdOverlay paused={true} />);
    act(() => vi.advanceTimersByTime(2000));
    rerender(<PauseAdOverlay paused={false} />);
    expect(screen.queryByTestId('ad-banner')).toBeNull();
  });
});
