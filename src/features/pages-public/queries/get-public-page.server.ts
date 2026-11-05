import { pageSlugError, type PublicPage, type PublicPageListItem } from '@live-show/api-contracts';

// Server-side fetch: native fetch, public endpoints, no auth. Never throws:
// a missing or failing page must render not-found, not 500 the route.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

const REVALIDATE_OPTIONS = { next: { revalidate: 300, tags: ['pages'] } };

export async function fetchPublicPage(slug: string): Promise<PublicPage | null> {
  if (pageSlugError(slug)) return null;
  try {
    const res = await fetch(`${apiBase()}/pages/${encodeURIComponent(slug)}`, REVALIDATE_OPTIONS);
    if (!res.ok) return null;
    return (await res.json()) as PublicPage;
  } catch {
    return null;
  }
}

export async function fetchPublicPageList(): Promise<PublicPageListItem[]> {
  try {
    const res = await fetch(`${apiBase()}/pages`, REVALIDATE_OPTIONS);
    if (!res.ok) return [];
    return (await res.json()) as PublicPageListItem[];
  } catch {
    return [];
  }
}
