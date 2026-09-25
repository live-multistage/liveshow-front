import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EventsListPageContent } from '@/features/events';
import { fetchFeedPage } from '@/features/events/queries/get-feed.server';

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

function parsePage(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function Shows({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedPage = parsePage(params.page);

  // SSR-seed the requested page (cached 30s in Next's Data Cache) so the
  // catalog is in the initial HTML and the client query skips its first
  // refetch — matches the home feed's caching.
  let initialPage = await fetchFeedPage(requestedPage, PAGE_SIZE);

  // Out-of-range page (e.g. ?page=999): clamp to the last real page.
  const pageCount = Math.max(1, Math.ceil(initialPage.total / PAGE_SIZE));
  if (initialPage.total > 0 && requestedPage > pageCount) {
    initialPage = await fetchFeedPage(pageCount, PAGE_SIZE);
  }

  return (
    // EventsListPageContent reads `?page=` via useSearchParams — without
    // Suspense the build reclaims the whole route into a CSR bailout.
    <Suspense>
      <EventsListPageContent initialPage={initialPage} pageSize={PAGE_SIZE} />
    </Suspense>
  );
}
