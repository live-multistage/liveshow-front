import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { usePlayerOpened } from './use-player-opened';

const mockTrack = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: mockTrack }) }));

function Harness({ eventId, mode, hasAccess }: { eventId: string; mode: 'live' | 'replay'; hasAccess: boolean }) {
  usePlayerOpened(eventId, mode, hasAccess);
  return null;
}

describe('usePlayerOpened', () => {
  beforeEach(() => mockTrack.mockClear());

  it('tracks player_opened once on mount', () => {
    render(<Harness eventId="evt-1" mode="live" hasAccess={false} />);
    expect(mockTrack).toHaveBeenCalledWith('player_opened', { eventId: 'evt-1', mode: 'live', hasAccess: false });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('tracks player_opened exactly once under StrictMode (dev double-invoke)', () => {
    render(
      <StrictMode>
        <Harness eventId="evt-1" mode="replay" hasAccess={false} />
      </StrictMode>,
    );
    expect(mockTrack).toHaveBeenCalledWith('player_opened', { eventId: 'evt-1', mode: 'replay', hasAccess: false });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
