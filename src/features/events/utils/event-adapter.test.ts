import { describe, expect, it } from 'vitest';
import { eventToShow } from './event-adapter';
import type { EventResponse } from '../types/event.types';

const event = {
  id: 'e1',
  slug: 'late-show',
  title: 'Late Show',
  category: 'OTHER',
  status: 'SCHEDULED',
  camerasCount: 1,
  // 22:30 in São Paulo (UTC-3) is already the next day in UTC.
  startsAt: '2026-10-11T01:30:00.000Z',
  endsAt: '2026-10-11T03:30:00.000Z',
} as unknown as EventResponse;

describe('eventToShow', () => {
  // Server (UTC) and browser (any zone) must render the same text, or React
  // throws hydration error #418 on every page with a ShowCard.
  it('formats date and time in the São Paulo zone regardless of the runtime zone', () => {
    const show = eventToShow(event);
    expect(show.date).toBe('2026-10-10');
    expect(show.time).toBe('22:30');
  });
});
