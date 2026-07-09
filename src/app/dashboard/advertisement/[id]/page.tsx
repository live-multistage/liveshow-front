import type { Metadata } from 'next';
import { AdDetailPage } from '@/features/advertisements/components/AdDetailPage';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Anúncio' };

export default async function DashboardAdDetailPage({ params }: Props) {
  const { id } = await params;
  return <AdDetailPage id={id} />;
}
