import type { Metadata } from 'next';
import { ChannelsPageContent } from '@/features/channels/components/dashboard/ChannelsPageContent';

export const metadata: Metadata = { title: 'Canais' };

export default function DashboardChannelsPage() {
  return <ChannelsPageContent />;
}
