import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useTrackRailViewed } from './use-track-rail-viewed';

const trackMock = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: trackMock }) }));

type Cb = (entries: Array<{ isIntersecting: boolean }>) => void;
let callbacks: Cb[] = [];

class FakeObserver {
  constructor(cb: Cb) { callbacks.push(cb); }
  observe() {}
  disconnect() {}
}

function Rail({ rail, position, itemCount }: { rail: string; position: number; itemCount: number }) {
  const ref = useTrackRailViewed<HTMLDivElement>(rail, position, itemCount);
  return <div ref={ref} />;
}

describe('useTrackRailViewed', () => {
  beforeEach(() => {
    callbacks = [];
    trackMock.mockClear();
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  it('emits home_rail_viewed once the rail is ≥50% on screen', () => {
    render(<Rail rail="category:music" position={2} itemCount={8} />);
    expect(trackMock).not.toHaveBeenCalled();

    callbacks[0]([{ isIntersecting: true }]);

    expect(trackMock).toHaveBeenCalledWith('home_rail_viewed', { rail: 'category:music', position: 2, itemCount: 8 });
  });

  it('emits only once even if it re-enters the viewport', () => {
    render(<Rail rail="category:music" position={0} itemCount={4} />);
    callbacks[0]([{ isIntersecting: true }]);
    callbacks[0]([{ isIntersecting: false }]);
    callbacks[0]([{ isIntersecting: true }]);

    expect(trackMock).toHaveBeenCalledTimes(1);
  });
});
