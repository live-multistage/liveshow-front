import { describe, it, expect } from 'vitest';
import { buildEventJsonLd } from './event-json-ld';
import type { EventResponse } from '../types/event.types';

const base = {
  id: 'evt-1',
  slug: 'rock-fest',
  title: 'Rock Fest',
  description: 'Um show incrível',
  startsAt: '2026-09-01T21:00:00.000Z',
  endsAt: '2026-09-01T23:00:00.000Z',
  status: 'SCHEDULED',
  bannerUrl: 'https://cdn/banner.jpg',
  thumbnailUrl: null,
  venue: null,
  city: null,
  country: null,
  organization: { name: 'Rock Org' },
  isFree: false,
} as unknown as EventResponse;

const URL = 'https://showon.io/events/rock-fest';

describe('buildEventJsonLd', () => {
  it('marks an online-only event and emits an AggregateOffer from the cents band', () => {
    const ld = buildEventJsonLd({ ...base, priceFromCents: 3990, priceToCents: 9990 }, URL);
    expect(ld['@type']).toBe('Event');
    expect(ld.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode');
    expect(ld.location).toEqual({ '@type': 'VirtualLocation', url: URL });
    expect(ld.offers).toMatchObject({ '@type': 'AggregateOffer', lowPrice: '39.90', highPrice: '99.90' });
    expect(ld.image).toEqual(['https://cdn/banner.jpg']);
  });

  it('uses a zero-price Offer for free events', () => {
    const ld = buildEventJsonLd({ ...base, isFree: true }, URL);
    expect(ld.offers).toMatchObject({ '@type': 'Offer', price: '0' });
  });

  it('is mixed-mode with a Place when the event has a venue', () => {
    const ld = buildEventJsonLd({ ...base, venue: 'Arena', city: 'SP', country: 'BR', isFree: true }, URL);
    expect(ld.eventAttendanceMode).toBe('https://schema.org/MixedEventAttendanceMode');
    expect(Array.isArray(ld.location)).toBe(true);
    expect((ld.location as unknown[])[1]).toMatchObject({ '@type': 'Place', address: 'Arena, SP, BR' });
  });

  it('marks a cancelled event and omits offers when price is unknown', () => {
    const ld = buildEventJsonLd({ ...base, status: 'CANCELLED', isFree: false, priceFromCents: undefined }, URL);
    expect(ld.eventStatus).toBe('https://schema.org/EventCancelled');
    expect(ld.offers).toBeUndefined();
  });
});
