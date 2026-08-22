import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { permanentRedirect } from 'next/navigation';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { EventDetailPageContent } from '@/features/events';
import { fetchEvent, fetchEventByParam, fetchTicketProducts } from '@/features/events/queries/get-event.server';
import { fetchLiveAccess, fetchReplayAccess, isTokenExpired } from '@/features/streaming/queries/streaming.server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liveshow.app';

interface Props {
  params: Promise<{ id: string }>;
}

// The segment accepts a UUID or a slug. Old links (and anything still built from
// an id) keep working: the page below 301s them to the slug.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: param } = await params;
  const event = await fetchEventByParam(param);
  if (!event) return { title: 'Evento' };
  return {
    title: event.title,
    // Canonical always points at the slug, never the UUID alias.
    alternates: { canonical: `${SITE_URL}/events/${event.slug || event.id}` },
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

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const isLoggedIn = !!accessToken && !isTokenExpired(accessToken);

  await Promise.allSettled([
    qc.prefetchQuery({ queryKey: ['events', 'detail', id], queryFn: () => fetchEvent(id) }),
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
