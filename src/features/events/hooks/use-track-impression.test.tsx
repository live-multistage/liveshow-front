import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useTrackImpression } from './use-track-impression';

vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));
import { track } from '@/lib/analytics/analytics-client';

type Cb = (entries: Array<{ isIntersecting: boolean }>) => void;
let callbacks: Cb[] = [];

class FakeObserver {
  constructor(cb: Cb) { callbacks.push(cb); }
  observe() {}
  disconnect() {}
}

function Card({ id }: { id: string }) {
  const ref = useTrackImpression<HTMLDivElement>(id);
  return <div ref={ref} />;
}

describe('useTrackImpression', () => {
  beforeEach(() => {
    callbacks = [];
    sessionStorage.clear();
    vi.mocked(track).mockClear();
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  it('emits event.impression once the card is on screen', () => {
    render(<Card id="evt-1" />);
    expect(track).not.toHaveBeenCalled();
    callbacks[0]([{ isIntersecting: true }]);
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'event.impression', entityId: 'evt-1' }));
  });

  it('does not emit while off screen', () => {
    render(<Card id="evt-1" />);
    callbacks[0]([{ isIntersecting: false }]);
    expect(track).not.toHaveBeenCalled();
  });

  it('emits once per session per event, even across remounts', () => {
    render(<Card id="evt-1" />);
    callbacks[0]([{ isIntersecting: true }]);
    render(<Card id="evt-1" />);
    callbacks[1]([{ isIntersecting: true }]);
    render(<Card id="evt-2" />);
    callbacks[2]([{ isIntersecting: true }]);
    expect(track).toHaveBeenCalledTimes(2);
  });
});
