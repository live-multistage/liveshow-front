import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { MyEventsStatusFilter } from '../types/my-events.types';

// The statuses the dashboard has a tab for; SCHEDULED has none, so it isn't read from the URL.
export const MY_EVENTS_STATUSES: MyEventsStatusFilter[] = ['DRAFT', 'PUBLISHED', 'LIVE', 'FINISHED', 'CANCELLED'];

export interface MyEventsUrlState {
  status?: MyEventsStatusFilter;
  page: number;
}

// Reads /dashboard/events?status=&page=. Unknown values fall back to the
// defaults (every event, page 1) instead of being forwarded to the API.
export function parseMyEventsParams(sp: URLSearchParams | ReadonlyURLSearchParams): MyEventsUrlState {
  const statusRaw = sp.get('status');
  const status = (MY_EVENTS_STATUSES as string[]).includes(statusRaw ?? '')
    ? (statusRaw as MyEventsStatusFilter)
    : undefined;

  const rawPage = Number(sp.get('page'));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  return status ? { status, page } : { page };
}

export function hrefForMyEvents({ status, page }: MyEventsUrlState): string {
  const next = new URLSearchParams();
  if (status) next.set('status', status);
  if (page > 1) next.set('page', String(page));
  const qs = next.toString();
  return qs ? `/dashboard/events?${qs}` : '/dashboard/events';
}
