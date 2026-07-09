import type { EventResponse } from '../types/event.types';
import type { Show, Camera } from '../types/show';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1619973226698-b77a5b5dd14b?auto=format&fit=crop&w=1080&q=80';

const CAMERA_COLORS = [
  { color: '#e63946', gradient: 'from-red-900 via-red-800 to-orange-900' },
  { color: '#457b9d', gradient: 'from-blue-900 via-blue-800 to-indigo-900' },
  { color: '#2a9d8f', gradient: 'from-teal-900 via-teal-800 to-green-900' },
  { color: '#e9c46a', gradient: 'from-yellow-900 via-yellow-800 to-amber-900' },
  { color: '#8338ec', gradient: 'from-purple-900 via-purple-800 to-violet-900' },
  { color: '#f77f00', gradient: 'from-orange-900 via-orange-800 to-red-900' },
  { color: '#06d6a0', gradient: 'from-emerald-900 via-emerald-800 to-teal-900' },
  { color: '#f72585', gradient: 'from-pink-900 via-pink-800 to-rose-900' },
];

function buildCameras(count: number): Camera[] {
  return Array.from({ length: Math.max(count, 1) }, (_, i) => ({
    id: `cam${i + 1}`,
    name: `Câmera ${i + 1}`,
    angle: `Vista ${i + 1}`,
    ...CAMERA_COLORS[i % CAMERA_COLORS.length],
  }));
}

export function eventToShow(event: EventResponse): Show {
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const durationMs = endsAt.getTime() - startsAt.getTime();
  const durationMin = Math.round(durationMs / 60000);
  const durationLabel =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? ` ${durationMin % 60}min` : ''}`
      : `${durationMin}min`;

  // priceFromCents/priceToCents are only present when the event has at
  // least one ticket product (see GetFeedUseCase, live-show-orchestrator) —
  // absent means "no ticket data," rendered the same as free (price: 0),
  // matching this component's pre-existing behavior for that case.
  const price = event.priceFromCents !== undefined ? event.priceFromCents / 100 : 0;
  const priceRange =
    event.priceToCents !== undefined && event.priceToCents !== event.priceFromCents
      ? { min: price, max: event.priceToCents / 100 }
      : undefined;

  return {
    id: event.id,
    title: event.title,
    artist: '',
    genre: 'Show',
    venue: event.venue ?? '',
    city: event.city ?? '',
    country: event.country ?? '',
    date: startsAt.toISOString().split('T')[0],
    time: startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    duration: durationLabel,
    image: event.thumbnailUrl ?? event.bannerUrl ?? FALLBACK_IMAGE,
    price,
    priceRange,
    currency: 'BRL',
    isLive: event.status === 'LIVE',
    hasReplay: event.status === 'FINISHED',
    cameras: buildCameras(event.camerasCount),
    description: event.description,
    tags: [],
    viewers: undefined,
    rating: undefined,
  };
}
