import type { SeoPageKey } from '@live-show/api-contracts';
import { JsonLd } from '@/shared/components/JsonLd';
import { getSeoForPage } from '../queries/get-seo.server';
import { resolveJsonLd, siteVars } from '../utils/resolve-seo';

// Admin-only JSON-LD for indexable pages that generate none of their own.
// Same (key, path) as the page's generateMetadata, so React cache dedupes the fetch.
export async function PageJsonLd({ pageKey, path }: { pageKey: SeoPageKey; path: string }) {
  const blocks = resolveJsonLd([], await getSeoForPage(pageKey, path), siteVars());
  return blocks.length > 0 ? <JsonLd data={blocks} /> : null;
}
