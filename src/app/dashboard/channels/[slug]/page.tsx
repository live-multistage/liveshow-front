import type { Metadata } from 'next';
import { ChannelDetailContent } from '@/features/channels/components/dashboard/ChannelDetailContent';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: 'Canal' };

// O canal é endereçado por slug (e não por id) porque é o slug que as queries e
// as invalidações do React Query usam — GET /channels/:slug já devolve rascunho
// para quem é da organização.
export default async function DashboardChannelDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ChannelDetailContent slug={slug} />;
}
