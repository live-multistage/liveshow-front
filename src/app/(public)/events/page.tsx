import type { Metadata } from 'next';
import { EventsListPageContent } from '@/features/events';
import { fetchFeedFirstPage } from '@/features/events/queries/get-feed.server';

export const metadata: Metadata = {
  title: 'Shows',
  description: 'Todos os shows, eventos e transmissões ao vivo disponíveis no showon.io.',
  alternates: { canonical: '/events' },
};

export default async function Shows() {
  // SSR-seed the listing's first page (cached 30s in Next's Data Cache) so the
  // catalog is in the initial HTML and the client infinite query skips its
  // first refetch — matches the home feed's caching.
  const initialFirstPage = await fetchFeedFirstPage();
  return <EventsListPageContent initialFirstPage={initialFirstPage} />;
}
