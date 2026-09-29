import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackMock = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: trackMock }) }));

import { renderHook } from '@testing-library/react';
import { useTrackArtistView } from './use-track-artist-view';

beforeEach(() => {
  trackMock.mockClear();
});

describe('useTrackArtistView', () => {
  it('tracks once when the artist is known from the start', () => {
    renderHook(({ artistId }) => useTrackArtistView(artistId), {
      initialProps: { artistId: 'a1' },
    });

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('artist_viewed', { artistId: 'a1' });
  });

  it('does not double-track on an unrelated rerender', () => {
    const { rerender } = renderHook(
      ({ artistId }: { artistId: string | undefined }) => useTrackArtistView(artistId),
      { initialProps: { artistId: 'a1' } },
    );
    expect(trackMock).toHaveBeenCalledTimes(1);

    rerender({ artistId: 'a1' });

    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it('tracks again when the artist changes', () => {
    const { rerender } = renderHook(
      ({ artistId }: { artistId: string | undefined }) => useTrackArtistView(artistId),
      { initialProps: { artistId: 'a1' } },
    );
    expect(trackMock).toHaveBeenCalledTimes(1);

    rerender({ artistId: 'a2' });

    expect(trackMock).toHaveBeenCalledTimes(2);
    expect(trackMock).toHaveBeenLastCalledWith('artist_viewed', { artistId: 'a2' });
  });

  it('does not track while the artist id is undefined', () => {
    renderHook(({ artistId }: { artistId: string | undefined }) => useTrackArtistView(artistId), {
      initialProps: { artistId: undefined },
    });

    expect(trackMock).not.toHaveBeenCalled();
  });
});
