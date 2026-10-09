import { cache } from 'react';
import type { ResolvedSeoConfig, SeoGlobal, SeoNoindex, SeoPageKey } from '@live-show/api-contracts';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

// SEO must never take a page down: any failure means "use the code defaults".
async function getSeoJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase()}${path}`, { next: { tags: ['seo'], revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getSeoGlobal = cache(() => getSeoJson<SeoGlobal>('/seo/global'));

export const getSeoForPage = cache((pageKey: SeoPageKey, path?: string) =>
  getSeoJson<ResolvedSeoConfig>(`/seo/pages/${pageKey}${path ? `?path=${encodeURIComponent(path)}` : ''}`),
);

export const getSeoNoindex = cache(() => getSeoJson<SeoNoindex>('/seo/noindex'));
