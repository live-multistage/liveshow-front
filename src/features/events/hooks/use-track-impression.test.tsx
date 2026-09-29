import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useTrackImpression } from './use-track-impression';

const trackMock = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: trackMock }) }));

type Cb = (entries: Array<{ isIntersecting: boolean }>) => void;
let callbacks: Cb[] = [];

class FakeObserver {
  constructor(cb: Cb) { callbacks.push(cb); }
  observe() {}
  disconnect() {}
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function Card({ id, list, position }: { id: string; list?: string; position?: number }) {
  const ref = useTrackImpression<HTMLDivElement>(id, list, position);
  return <div ref={ref} />;
}

describe('useTrackImpression', () => {
  beforeEach(() => {
    callbacks = [];
    trackMock.mockClear();
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    setVisibility('visible');
  });

  it('emits event_impression once the card is on screen, with list/position', () => {
    render(<Card id="evt-1" list="home:rail-1" position={2} />);
    expect(trackMock).not.toHaveBeenCalled();
    callbacks[0]([{ isIntersecting: true }]);
    expect(trackMock).toHaveBeenCalledWith('event_impression', { eventId: 'evt-1', list: 'home:rail-1', position: 2 });
  });

  it('does not emit while off screen', () => {
    render(<Card id="evt-1" list="home:rail-1" />);
    callbacks[0]([{ isIntersecting: false }]);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('does not emit again once already tracked for this card instance', () => {
    render(<Card id="evt-1" list="home:rail-1" />);
    callbacks[0]([{ isIntersecting: true }]);
    callbacks[0]([{ isIntersecting: false }]);
    callbacks[0]([{ isIntersecting: true }]);
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('does not track when no list is given (card outside an instrumented listing)', () => {
    render(<Card id="evt-1" />);
    expect(callbacks).toHaveLength(0);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('defers emitting while the tab is hidden, and fires once it becomes visible', () => {
    setVisibility('hidden');
    render(<Card id="evt-1" list="home:rail-1" position={1} />);

    callbacks[0]([{ isIntersecting: true }]);
    expect(trackMock).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(trackMock).toHaveBeenCalledWith('event_impression', { eventId: 'evt-1', list: 'home:rail-1', position: 1 });
  });

  it('does not emit on a visibility change with no pending hit', () => {
    render(<Card id="evt-1" list="home:rail-1" />);
    setVisibility('hidden');
    setVisibility('visible');
    expect(trackMock).not.toHaveBeenCalled();
  });
});
