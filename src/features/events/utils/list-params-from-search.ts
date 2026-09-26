import type { ReadonlyURLSearchParams } from 'next/navigation';
import { EVENT_CATEGORIES } from '../types/event.types';
import type { EventCategory, ListEventsFilter, ListEventsParams } from '../types/event.types';

const FILTERS: ListEventsFilter[] = ['upcoming', 'live', 'finished', 'all'];
const MAX_LENGTH = 120;

function trimmedParam(value: string | null): string | undefined {
  const v = value?.trim();
  if (!v || v.length > MAX_LENGTH) return undefined;
  return v;
}

// Reads the /events URL filters into the shape GET /events expects.
// Unknown/invalid values are dropped rather than forwarded to the API.
export function parseListParams(
  sp: URLSearchParams | ReadonlyURLSearchParams,
  pageSize: number,
): ListEventsParams {
  const filterRaw = sp.get('filter');
  const filter: ListEventsFilter = (FILTERS as string[]).includes(filterRaw ?? '')
    ? (filterRaw as ListEventsFilter)
    : 'all';

  const categoryRaw = sp.get('category');
  const category = (EVENT_CATEGORIES as string[]).includes(categoryRaw ?? '')
    ? (categoryRaw as EventCategory)
    : undefined;

  const subtype = trimmedParam(sp.get('subtype'));
  const tag = trimmedParam(sp.get('tag'));
  const city = trimmedParam(sp.get('city'));

  const freeRaw = sp.get('free');
  const free = freeRaw === '1' || freeRaw === 'true' ? true : undefined;

  const rawPage = Number(sp.get('page'));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const params: ListEventsParams = { filter, page, pageSize };
  if (category) params.category = category;
  if (subtype) params.subtype = subtype;
  if (tag) params.tag = tag;
  if (city) params.city = city;
  if (free) params.free = free;
  return params;
}

// Builds an /events href for `page`, preserving every other current param.
// page=1 omits the param entirely (canonical, no `?page=1` in links).
export function hrefForPage(sp: URLSearchParams | ReadonlyURLSearchParams, page: number): string {
  const next = new URLSearchParams(sp.toString());
  if (page <= 1) {
    next.delete('page');
  } else {
    next.set('page', String(page));
  }
  const qs = next.toString();
  return qs ? `/events?${qs}` : '/events';
}
