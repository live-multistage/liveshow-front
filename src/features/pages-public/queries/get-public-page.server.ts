import { unstable_cache } from 'next/cache';
import { pageSlugError, type PublicPage, type PublicPageListItem } from '@live-show/api-contracts';

// Server-side fetch: native fetch, public endpoints, no auth. Never throws:
// a missing or failing page must render not-found, not 500 the route.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

const CACHE_OPTIONS = { revalidate: 300, tags: ['pages'] };

// Next's fetch cache only stores 200 responses, so a 404 after unpublish would
// never replace the stale entry. unstable_cache stores the null result too.
// Non-404 failures throw inside so they are not cached; the wrappers swallow them.
const getCachedPage = (slug: string) =>
  unstable_cache(
    async (): Promise<PublicPage | null> => {
      const res = await fetch(`${apiBase()}/pages/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`pages/${slug}: ${res.status}`);
      return (await res.json()) as PublicPage;
    },
    ['public-page', slug],
    CACHE_OPTIONS,
  )();

const getCachedPageList = unstable_cache(
  async (): Promise<PublicPageListItem[]> => {
    const res = await fetch(`${apiBase()}/pages`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`pages: ${res.status}`);
    return (await res.json()) as PublicPageListItem[];
  },
  ['public-page-list'],
  CACHE_OPTIONS,
);

export async function fetchPublicPage(slug: string): Promise<PublicPage | null> {
  if (pageSlugError(slug)) return null;
  try {
    return await getCachedPage(slug);
  } catch {
    return null;
  }
}

export async function fetchPublicPageList(): Promise<PublicPageListItem[]> {
  try {
    return await getCachedPageList();
  } catch {
    return [];
  }
}
