import { fetchFeatureFlags } from '@/features/feature-flags';
import { fetchPublicPage } from './get-public-page.server';

// Flag off is indistinguishable from a missing page: callers treat null as 404 and never leak the page.
export async function loadPublishedPage(slug: string) {
  const [flags, page] = await Promise.all([fetchFeatureFlags(), fetchPublicPage(slug)]);
  return flags.page_builder ? page : null;
}
