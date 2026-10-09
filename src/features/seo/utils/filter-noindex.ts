import type { MetadataRoute } from 'next';
import { normalizeSeoPath, pageKeyForPath, type SeoNoindex } from '@live-show/api-contracts';

export function filterNoindex(entries: MetadataRoute.Sitemap, noindex: SeoNoindex | null, siteUrl: string): MetadataRoute.Sitemap {
  if (!noindex) return entries;
  const paths = new Set(noindex.paths);
  const keys = new Set<string>(noindex.pageKeys);
  return entries.filter((entry) => {
    const path = normalizeSeoPath(entry.url.slice(siteUrl.length));
    const key = pageKeyForPath(path);
    return !paths.has(path) && !(key && keys.has(key));
  });
}
