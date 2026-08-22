import type { MetadataRoute } from 'next';
import type { PaginatedEventsResponse } from '@/features/events/types/event.types';
import { eventHref } from '@/features/events/utils/slug';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liveshow.app';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

// GET /events is public and paginated; walk it to enumerate event pages and
// derive the organization profiles from each event's embedded organization.
// Fail-soft: an API hiccup yields a static-only sitemap instead of a 500.
async function fetchAllEvents() {
  const items: PaginatedEventsResponse['items'] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(`${apiBase()}/events?page=${page}&pageSize=${PAGE_SIZE}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const data = (await res.json()) as PaginatedEventsResponse;
      items.push(...data.items);
      if (items.length >= data.total || data.items.length < PAGE_SIZE) break;
    }
  } catch {
    // network/API down — serve the static entries only
  }
  return items;
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await fetchAllEvents();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/events`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/help`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${SITE_URL}${eventHref(event)}`,
    changeFrequency: event.status === 'LIVE' ? 'hourly' : 'daily',
    priority: event.status === 'LIVE' ? 0.9 : 0.7,
  }));

  const orgSlugs = [...new Set(events.map((e) => e.organization?.slug).filter((s): s is string => !!s))];
  const orgEntries: MetadataRoute.Sitemap = orgSlugs.map((slug) => ({
    url: `${SITE_URL}/o/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticEntries, ...eventEntries, ...orgEntries];
}
