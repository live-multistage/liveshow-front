import type { Metadata } from 'next';
import { AdDetailPage } from '@/features/advertisements/components/AdDetailPage';

export const metadata: Metadata = { title: 'Detalhes do Anúncio' };

export default async function DashboardAdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdDetailPage id={id} />;
}
