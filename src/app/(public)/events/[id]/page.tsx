import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { EventDetailPageContent } from '@/features/events';
import { fetchEvent, fetchTicketProducts } from '@/features/events/queries/get-event.server';
import { fetchLiveAccess, fetchReplayAccess, isTokenExpired } from '@/features/streaming/queries/streaming.server';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await fetchEvent(id);
    return { title: event.title };
  } catch {
    return { title: 'Evento' };
  }
}

export default async function ShowDetail({ params }: Props) {
  const { id } = await params;
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
