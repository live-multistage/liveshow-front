import { cache } from 'react';
import type { SeriesDetail, SeriesListItem } from '../types/series.types';

// Server-side fetch: native fetch, not the axios httpClient (which is
// 'use client' and carries browser-only auth interceptors). Public endpoint —
// no Authorization header needed. Mirrors get-channels.server.ts.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

// Revalida a cada 30s: nextEpisode muda com a grade, mas um trilho da home
// não justifica um fetch por request. Nunca lança — série indisponível não
// pode derrubar a home.
export const fetchSeries = cache(async (): Promise<SeriesListItem[]> => {
  try {
    const res = await fetch(`${apiBase()}/series`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    return (await res.json()) as SeriesListItem[];
  } catch {
    return [];
  }
});

// Used by the /series/[slug] route for generateMetadata (page title) — the
// client component fetches its own copy via useSeriesQuery for rendering.
export const fetchSeriesBySlug = cache(async (slug: string): Promise<SeriesDetail | null> => {
  try {
    const res = await fetch(`${apiBase()}/series/${slug}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return (await res.json()) as SeriesDetail;
  } catch {
    return null;
  }
});
