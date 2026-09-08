import type { MetadataRoute } from 'next';
import type { PaginatedEventsResponse } from '@/features/events/types/event.types';
import type { ChannelListItem } from '@/features/channels/types/channel.types';
import type { ArtistListItem } from '@live-show/api-contracts';
import { eventHref } from '@/features/events/utils/slug';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

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

// Artists catalog walks paginated endpoint, fail-soft.
// ponytail: capped at 2 pages (artists catalog likely small); expand if needed.
async function fetchArtists() {
  const items: ArtistListItem[] = [];
  try {
    for (let page = 1; page <= 2; page++) {
      const res = await fetch(`${apiBase()}/artists?page=${page}&pageSize=${PAGE_SIZE}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const data = (await res.json()) as { items: ArtistListItem[]; total: number };
      items.push(...data.items);
      if (items.length >= data.total) break;
    }
  } catch {
    // network/API down — serve without artist entries
  }
  return items;
}

// Channels are a small public catalog — one fetch, fail-soft.
async function fetchList<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${apiBase()}${path}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, channels, artists] = await Promise.all([
    fetchAllEvents(),
    fetchList<ChannelListItem>('/channels'),
    fetchArtists(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE_URL}/events`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/artists`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/be-partner`, changeFrequency: 'monthly', priority: 0.6 },
    ...(channels.length ? [{ url: `${SITE_URL}/channels`, changeFrequency: 'daily' as const, priority: 0.8 }] : []),
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

  const channelEntries: MetadataRoute.Sitemap = channels.map((channel) => ({
    url: `${SITE_URL}/channels/${channel.slug}`,
    changeFrequency: channel.isOnAir ? 'hourly' : 'daily',
    priority: 0.7,
  }));

  const artistEntries: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: `${SITE_URL}/artists/${artist.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticEntries, ...eventEntries, ...orgEntries, ...channelEntries, ...artistEntries];
}
