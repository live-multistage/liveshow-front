import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEventCached } from '@/features/events/queries/get-event.server';
import type { EventResponse } from '@/features/events/types/event.types';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { toMetaDescription } from '@/features/seo/utils/meta-description';
import { WatchGate } from '@/features/streaming/components/WatchGate';
import { parseStartSeconds, watchPath } from '@/features/streaming/utils/watch-route';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}

async function findEvent(id: string): Promise<EventResponse | null> {
  try {
    return await getEventCached(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await findEvent(id);
  if (!event) return { title: 'Assistir', robots: { index: false, follow: false } };

  const description = toMetaDescription(event.description ?? '');
  const image = event.bannerUrl ?? event.thumbnailUrl;
  const images = image ? [{ url: image }] : undefined;
  // A page-level openGraph/twitter replaces the layout's whole object, so
  // everything the share card needs is restated here, not just what changed.
  return {
    title: event.title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'showon.io',
      url: `${SITE_URL}${watchPath(event.id)}`,
      title: event.title,
      description,
      images,
    },
    twitter: { card: 'summary_large_image', title: event.title, description, images },
  };
}

export default async function WatchPage({ params, searchParams }: Props) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const [event, flags] = await Promise.all([findEvent(id), fetchFeatureFlags()]);
  if (!event) notFound();

  return (
    <WatchGate
      event={event}
      chatEnabled={flags.chat}
      adsEnabled={flags.ads_delivery}
      startAtSeconds={parseStartSeconds(typeof t === 'string' ? t : null)}
    />
  );
}
