import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));

import { renderHook } from '@testing-library/react';
import { useTrackArtistView } from './use-track-artist-view';
import { track } from '@/lib/analytics/analytics-client';

const trackMock = vi.mocked(track);

beforeEach(() => {
  trackMock.mockClear();
});

describe('useTrackArtistView', () => {
  it('tracks once when the artist is known from the start', () => {
    renderHook(({ artistId, userId }) => useTrackArtistView(artistId, userId), {
      initialProps: { artistId: 'a1', userId: 'user-1' },
    });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      eventType: 'event.artist_viewed',
      entityType: 'artist',
      entityId: 'a1',
      userId: 'user-1',
    });
  });

  it('does not double-track when auth hydrates after the artist loads', () => {
    const { rerender } = renderHook(
      ({ artistId, userId }: { artistId: string | undefined; userId: string | undefined }) =>
        useTrackArtistView(artistId, userId),
      { initialProps: { artistId: 'a1', userId: undefined } },
    );
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'a1', userId: undefined }),
    );

    rerender({ artistId: 'a1', userId: 'user-1' });

    expect(track).toHaveBeenCalledTimes(1);
  });

  it('tracks again when the artist changes', () => {
    const { rerender } = renderHook(
      ({ artistId, userId }: { artistId: string | undefined; userId: string | undefined }) =>
        useTrackArtistView(artistId, userId),
      { initialProps: { artistId: 'a1', userId: 'user-1' } },
    );
    expect(track).toHaveBeenCalledTimes(1);

    rerender({ artistId: 'a2', userId: 'user-1' });

    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith(
      expect.objectContaining({ entityId: 'a2' }),
    );
  });

  it('does not track while the artist id is undefined', () => {
    renderHook(({ artistId, userId }: { artistId: string | undefined; userId: string | undefined }) =>
      useTrackArtistView(artistId, userId), {
      initialProps: { artistId: undefined, userId: 'user-1' },
    });

    expect(track).not.toHaveBeenCalled();
  });
});
