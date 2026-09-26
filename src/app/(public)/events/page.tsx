import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EventsListPageContent } from '@/features/events';
import { fetchFeedPage } from '@/features/events/queries/get-feed.server';
import { parseListParams } from '@/features/events/utils/list-params-from-search';

const TITLE = 'Shows';
const DESCRIPTION = 'Todos os shows, eventos e transmissões ao vivo disponíveis no showon.io.';
const PAGE_SIZE = 24;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/events' },
  openGraph: { type: 'website', url: '/events', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export const revalidate = 300;

// Rebuilds a URLSearchParams from Next's searchParams record (each value is a
// string or the first of a repeated key) so SSR parses the same shape the
// client's useSearchParams() gives EventsListPageContent.
function toURLSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    sp.set(key, Array.isArray(value) ? value[0] : value);
  }
  return sp;
}

export default async function Shows({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseListParams(toURLSearchParams(rawParams), PAGE_SIZE);

  // SSR-seed the requested page (cached 30s in Next's Data Cache) so the
  // catalog is in the initial HTML and the client query skips its first
  // refetch — matches the home feed's caching.
  let initialPage = await fetchFeedPage(params);

  // Out-of-range page (e.g. ?page=999): clamp to the last real page.
  const pageCount = Math.max(1, Math.ceil(initialPage.total / PAGE_SIZE));
  if (initialPage.total > 0 && (params.page ?? 1) > pageCount) {
    initialPage = await fetchFeedPage({ ...params, page: pageCount });
  }

  return (
    // EventsListPageContent reads `?page=` via useSearchParams — without
    // Suspense the build reclaims the whole route into a CSR bailout.
    <Suspense>
      <EventsListPageContent initialPage={initialPage} pageSize={PAGE_SIZE} />
    </Suspense>
  );
}
