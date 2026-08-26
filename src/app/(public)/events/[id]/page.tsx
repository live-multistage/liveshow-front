import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { permanentRedirect } from 'next/navigation';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { EventDetailPageContent } from '@/features/events';
import { fetchEvent, fetchEventByParam, fetchTicketProducts } from '@/features/events/queries/get-event.server';
import { fetchLiveAccess, fetchReplayAccess, isTokenExpired } from '@/features/streaming/queries/streaming.server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

interface Props {
  params: Promise<{ id: string }>;
}

// Meta descriptions get truncated around 160 chars anyway; cut on a word so the
// ellipsis doesn't land mid-word.
function toDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')) || cut}…`;
}

// The segment accepts a UUID or a slug. Old links (and anything still built from
// an id) keep working: the page below 308s them to the slug.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: param } = await params;
  const event = await fetchEventByParam(param);

  // Unresolvable param — a dead link, a draft, or the API being down. Serving a
  // soft-404 body under a 200 is exactly what noindex exists for: without it
  // every bad URL accretes as a thin duplicate page in the index.
  if (!event) return { title: 'Evento', robots: { index: false, follow: false } };

  const url = `${SITE_URL}/events/${event.slug || event.id}`;
  const description = toDescription(event.description ?? '');

  return {
    title: event.title,
    description,
    // Canonical always points at the slug, never the UUID alias.
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: event.title,
      description,
      // No `images` on purpose: the co-located opengraph-image route already
      // renders a richer card (banner + title + date + venue), and setting
      // images here would replace it with the bare banner.
    },
  };
}

export default async function ShowDetail({ params }: Props) {
  const { id: param } = await params;
  const event = await fetchEventByParam(param);

  // permanentRedirect throws — it must run outside fetchEventByParam's try/catch.
  if (event?.slug && param !== event.slug) permanentRedirect(`/events/${event.slug}`);

  // Unresolvable param: fall through with it as-is so the client component
  // renders its own "not found" state, as it did before slugs existed.
  const id = event?.id ?? param;
  const qc = new QueryClient();

  // Already fetched above — seed it rather than prefetching the same event a
  // second time. Only the unresolved case still needs a fetch, and that one is
  // expected to fail into the client's not-found state.
  if (event) qc.setQueryData(['events', 'detail', id], event);

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const isLoggedIn = !!accessToken && !isTokenExpired(accessToken);

  await Promise.allSettled([
    ...(event ? [] : [
      qc.prefetchQuery({ queryKey: ['events', 'detail', id], queryFn: () => fetchEvent(id) }),
    ]),
    qc.prefetchQuery({ queryKey: ['events', 'tickets', id], queryFn: () => fetchTicketProducts(id) }),
    ...(isLoggedIn ? [
      qc.prefetchQuery({
        queryKey: ['live', 'access', id],
        queryFn: () => fetchLiveAccess(id, accessToken),
      }),
      qc.prefetchQuery({
        queryKey: ['live', 'replay-access', id],
        queryFn: () => fetchReplayAccess(id, accessToken),
      }),
    ] : []),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <EventDetailPageContent id={id} />
    </HydrationBoundary>
  );
}
