import type { Metadata } from 'next';
import { fetchSeriesBySlug } from '@/features/series/queries/get-series.server';
import { SeriesPageContent } from '@/features/series/components/SeriesPageContent';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const series = await fetchSeriesBySlug(slug);
  return { title: series?.name ?? 'Série' };
}

export default async function SeriesDetailPage({ params }: Props) {
  const { slug } = await params;
  return <SeriesPageContent slug={slug} />;
}
