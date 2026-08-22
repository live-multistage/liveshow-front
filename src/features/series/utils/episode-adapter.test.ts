import { describe, it, expect } from 'vitest';
import { episodeToShow } from './episode-adapter';
import type { SeriesEpisode } from '../types/series.types';

function makeEpisode(overrides: Partial<SeriesEpisode> = {}): SeriesEpisode {
  return {
    id: 'evt-1',
    title: 'Episódio 3',
    startsAt: '2026-08-20T23:00:00.000Z',
    endsAt: '2026-08-21T01:00:00.000Z',
    status: 'FINISHED',
    detachedFromSeries: false,
    thumbnailUrl: null,
    ...overrides,
  };
}

describe('episodeToShow', () => {
  it('maps id/title through and marks a FINISHED episode as replayable', () => {
    const show = episodeToShow(makeEpisode(), 'Quinta do Rock');

    expect(show.id).toBe('evt-1');
    expect(show.title).toBe('Episódio 3');
    expect(show.hasReplay).toBe(true);
    expect(show.isLive).toBe(false);
  });

  it('marks a LIVE episode as live, not replayable', () => {
    const show = episodeToShow(makeEpisode({ status: 'LIVE' }), 'Quinta do Rock');

    expect(show.isLive).toBe(true);
    expect(show.hasReplay).toBe(false);
  });

  it('falls back to the fallback image when there is no thumbnail', () => {
    const show = episodeToShow(makeEpisode({ thumbnailUrl: null }), 'Quinta do Rock');

    expect(show.image).toContain('unsplash.com');
  });

  it('uses the thumbnail when present', () => {
    const show = episodeToShow(
      makeEpisode({ thumbnailUrl: 'https://cdn.example.com/ep3.jpg' }),
      'Quinta do Rock',
    );

    expect(show.image).toBe('https://cdn.example.com/ep3.jpg');
  });
});
