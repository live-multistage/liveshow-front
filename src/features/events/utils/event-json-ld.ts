import type { EventResponse } from '../types/event.types';

// schema.org Event JSON-LD for a streaming (and optionally in-person) event.
// Enables Google's Event rich result and, via the offers, price snippets.
// Built from the EventResponse alone — no extra fetch — so any field that
// isn't present is simply omitted rather than guessed.
export function buildEventJsonLd(event: EventResponse, url: string): Record<string, unknown> {
  const hasVenue = Boolean(event.venue || event.city);

  // A streaming platform: every event is watchable online. When it also has a
  // physical venue it's a mixed-mode event with two locations.
  const virtualLocation = { '@type': 'VirtualLocation', url };
  const location: Record<string, unknown> | Array<Record<string, unknown>> = hasVenue
    ? [
        virtualLocation,
        {
          '@type': 'Place',
          name: event.venue ?? event.city ?? undefined,
          address: [event.venue, event.city, event.country].filter(Boolean).join(', ') || undefined,
        },
      ]
    : virtualLocation;

  const image = [event.bannerUrl, event.thumbnailUrl].filter(Boolean);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventAttendanceMode: hasVenue
      ? 'https://schema.org/MixedEventAttendanceMode'
      : 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus:
      event.status === 'CANCELLED'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    location,
    url,
  };

  if (event.description) jsonLd.description = event.description;
  if (image.length) jsonLd.image = image;
  if (event.organization?.name) {
    jsonLd.organizer = {
      '@type': 'Organization',
      name: event.organization.name,
    };
  }

  // Offers: cents → decimal string, in the event's own currency band. Free
  // events advertise a zero-price offer; paid ones an AggregateOffer across
  // the ticket range so the price snippet shows "from R$ X".
  const offerBase = { availability: 'https://schema.org/InStock', url };
  if (event.isFree) {
    jsonLd.offers = { '@type': 'Offer', price: '0', priceCurrency: 'BRL', ...offerBase };
  } else if (event.priceFromCents != null) {
    jsonLd.offers = {
      '@type': 'AggregateOffer',
      lowPrice: (event.priceFromCents / 100).toFixed(2),
      highPrice: ((event.priceToCents ?? event.priceFromCents) / 100).toFixed(2),
      priceCurrency: 'BRL',
      offerCount: 1,
      ...offerBase,
    };
  }

  return jsonLd;
}
