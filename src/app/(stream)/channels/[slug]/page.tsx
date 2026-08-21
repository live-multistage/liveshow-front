import type { Metadata } from 'next';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { ChannelGate } from '@/features/channels/components/ChannelGate';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: 'Canal' };

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;
  const flags = await fetchFeatureFlags();

  return <ChannelGate slug={slug} chatEnabled={flags.chat} />;
}
