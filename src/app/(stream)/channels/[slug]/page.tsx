import type { Metadata } from 'next';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { ChannelGate } from '@/features/channels/components/ChannelGate';
import { fetchChannelBySlug } from '@/features/channels/queries/get-channels.server';
import { JsonLd } from '@/shared/components/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

interface Props {
  params: Promise<{ slug: string }>;
}

function channelDescription(description: string | null, name: string): string {
  const clean = (description ?? '').replace(/\s+/g, ' ').trim();
  if (clean) return clean.length <= 160 ? clean : `${clean.slice(0, 160).replace(/\s+\S*$/, '')}…`;
  return `Canal 24h ${name} — programação ao vivo e contínua no showon.io.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const channel = await fetchChannelBySlug(slug);
  if (!channel) return { title: 'Canal', robots: { index: false, follow: false } };

  const url = `${SITE_URL}/channels/${channel.slug}`;
  const description = channelDescription(channel.description, channel.name);
  return {
    title: channel.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: channel.name,
      description,
      images: channel.coverUrl ? [{ url: channel.coverUrl }] : undefined,
    },
  };
}

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;
  const [flags, channel] = await Promise.all([fetchFeatureFlags(), fetchChannelBySlug(slug)]);

  const qc = new QueryClient();
  if (channel) qc.setQueryData(['channels', 'detail', slug], channel);

  // schema.org BroadcastService for a linear 24h channel.
  const channelJsonLd = channel && {
    '@context': 'https://schema.org',
    '@type': 'BroadcastService',
    name: channel.name,
    url: `${SITE_URL}/channels/${channel.slug}`,
    ...(channel.description ? { description: channel.description } : {}),
    broadcastDisplayName: channel.name,
  };

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      {channelJsonLd && <JsonLd data={channelJsonLd} />}
      <ChannelGate slug={slug} chatEnabled={flags.chat} />
    </HydrationBoundary>
  );
}
