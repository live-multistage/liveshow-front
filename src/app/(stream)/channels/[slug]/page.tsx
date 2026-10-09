import type { Metadata } from 'next';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { ChannelGate } from '@/features/channels/components/ChannelGate';
import { fetchChannelBySlug } from '@/features/channels/queries/get-channels.server';
import { JsonLd } from '@/shared/components/JsonLd';
import { applySeo, getSeoForPage, resolveJsonLd } from '@/features/seo';
import { channelSeoVars } from '@/features/seo/utils/channel-seo-vars';

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
  const base: Metadata = {
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
    twitter: { card: 'summary_large_image', title: channel.name, description },
  };
  return applySeo(base, await getSeoForPage('channels.detail', `/channels/${channel.slug}`), channelSeoVars(channel, url));
}

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;
  const [flags, channel] = await Promise.all([fetchFeatureFlags(), fetchChannelBySlug(slug)]);

  const qc = new QueryClient();
  if (channel) qc.setQueryData(['channels', 'detail', slug], channel);

  const seo = channel ? await getSeoForPage('channels.detail', `/channels/${channel.slug}`) : null;

  // schema.org BroadcastService for a linear 24h channel.
  const channelJsonLd = channel && {
    '@context': 'https://schema.org',
    '@type': 'BroadcastService',
    name: channel.name,
    url: `${SITE_URL}/channels/${channel.slug}`,
    ...(channel.description ? { description: channel.description } : {}),
    broadcastDisplayName: channel.name,
  };

  const breadcrumbJsonLd = channel && {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Canais', item: `${SITE_URL}/channels` },
      { '@type': 'ListItem', position: 3, name: channel.name, item: `${SITE_URL}/channels/${channel.slug}` },
    ],
  };

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      {channel && channelJsonLd && breadcrumbJsonLd && (
        <JsonLd
          data={resolveJsonLd(
            [channelJsonLd, breadcrumbJsonLd],
            seo,
            channelSeoVars(channel, `${SITE_URL}/channels/${channel.slug}`),
          )}
        />
      )}
      <ChannelGate slug={slug} chatEnabled={flags.chat} adsEnabled={flags.ads_delivery} />
    </HydrationBoundary>
  );
}
