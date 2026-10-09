import type { EventResponse } from '@/features/events/types/event.types';
import { eventLowPrice } from '@/features/events/utils/event-json-ld';
import type { SeoVars } from './resolve-seo';

export function eventSeoVars(event: EventResponse, url: string): SeoVars {
  return {
    'event.name': event.title,
    'event.description': event.description ?? '',
    'event.startsAt': event.startsAt,
    'event.endsAt': event.endsAt ?? '',
    'event.imageUrl': event.bannerUrl ?? '',
    'event.url': url,
    'event.priceFrom': event.isFree ? '0' : (eventLowPrice(event) ?? ''),
    'organization.name': event.organization?.name ?? '',
    'artist.name': event.artists?.[0]?.name ?? '',
  };
}
