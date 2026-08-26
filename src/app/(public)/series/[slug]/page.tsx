import type { Metadata } from 'next';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { fetchSeriesBySlug } from '@/features/series/queries/get-series.server';
import { SeriesPageContent } from '@/features/series/components/SeriesPageContent';
import { JsonLd } from '@/shared/components/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

interface Props {
  params: Promise<{ slug: string }>;
}

function toDescription(text: string | null, name: string): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean) return clean.length <= 160 ? clean : `${clean.slice(0, 160).replace(/\s+\S*$/, '')}…`;
  return `Acompanhe ${name}, programa recorrente com transmissões ao vivo no showon.io.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const series = await fetchSeriesBySlug(slug);
  if (!series) return { title: 'Série', robots: { index: false, follow: false } };

  const url = `${SITE_URL}/series/${series.slug}`;
  const description = toDescription(series.description, series.name);
  const image = series.nextEpisode?.thumbnailUrl ?? undefined;
  return {
    title: series.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: series.name,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function SeriesDetailPage({ params }: Props) {
  const { slug } = await params;
  const series = await fetchSeriesBySlug(slug);

  const qc = new QueryClient();
  if (series) qc.setQueryData(['series', 'detail', slug], series);

  // schema.org exposes a recurring program as an EventSeries of sub-events.
  const seriesJsonLd = series && {
    '@context': 'https://schema.org',
    '@type': 'EventSeries',
    name: series.name,
    url: `${SITE_URL}/series/${series.slug}`,
    ...(series.description ? { description: series.description } : {}),
    ...(series.nextEpisode
      ? {
          subEvent: {
            '@type': 'Event',
            name: series.nextEpisode.title,
            startDate: series.nextEpisode.startsAt,
            endDate: series.nextEpisode.endsAt,
            eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
          },
        }
      : {}),
  };

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      {seriesJsonLd && <JsonLd data={seriesJsonLd} />}
      <SeriesPageContent slug={slug} />
    </HydrationBoundary>
  );
}
