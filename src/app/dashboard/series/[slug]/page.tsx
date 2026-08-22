import type { Metadata } from 'next';
import { SeriesDetailContent } from '@/features/series/components/dashboard/SeriesDetailContent';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: 'Série' };

// A série é endereçada por slug, igual ao canal — GET /series/:slug é público
// mas devolve o suficiente (incluindo templateEventId) para a tela de gestão.
export default async function DashboardSeriesDetailPage({ params }: Props) {
  const { slug } = await params;
  return <SeriesDetailContent slug={slug} />;
}
