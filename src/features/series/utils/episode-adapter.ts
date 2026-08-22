import { FALLBACK_IMAGE } from '@/features/events/utils/event-adapter';
import type { Show } from '@/features/events/types/show';
import type { SeriesEpisode } from '../types/series.types';

// ponytail: SeriesEpisode is a thin projection returned by the series
// endpoints (id/title/startsAt/endsAt/status/thumbnailUrl only — no
// venue/price/camera data). ShowCard needs a full Show, so the fields it
// doesn't render for a series episode get safe defaults instead of firing an
// extra fetch per replay just to reuse the card. Upgrade to a real fetch if a
// future page needs those fields to be accurate here.
export function episodeToShow(episode: SeriesEpisode, seriesName: string, locale = 'pt-BR'): Show {
  const startsAt = new Date(episode.startsAt);

  return {
    id: episode.id,
    title: episode.title,
    artist: '',
    category: seriesName,
    venue: seriesName,
    city: '',
    country: '',
    date: startsAt.toISOString().split('T')[0],
    time: startsAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    duration: '',
    image: episode.thumbnailUrl ?? FALLBACK_IMAGE,
    price: 0,
    currency: 'BRL',
    isLive: episode.status === 'LIVE',
    hasReplay: episode.status === 'FINISHED',
    cameras: [],
    description: '',
    tags: [],
  };
}
