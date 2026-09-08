import type { Metadata } from 'next';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { ArtistPublicPage } from '@/features/artists';
import { artistKey, artistEventsKey } from '@/features/artists/hooks/use-artists';
import {
  fetchArtistByParam,
  fetchArtistEvents,
} from '@/features/artists/queries/get-artist.server';
import { JsonLd } from '@/shared/components/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://showon.io';

interface Props {
  params: Promise<{ slug: string }>;
}

function toDescription(text: string | undefined, name: string): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean) return clean.length <= 160 ? clean : `${clean.slice(0, 160).replace(/\s+\S*$/, '')}…`;
  return `Shows e transmissões ao vivo de ${name} no showon.io.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await fetchArtistByParam(slug);
  if (!artist) return { title: 'Artista', robots: { index: false, follow: false } };

  const url = `${SITE_URL}/artists/${artist.slug}`;
  const description = toDescription(artist.description, artist.name);
  return {
    title: artist.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile',
      url,
      title: artist.name,
      description,
      images: artist.bannerUrl ? [{ url: artist.bannerUrl }] : undefined,
    },
    twitter: { card: 'summary_large_image', title: artist.name, description },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const artist = await fetchArtistByParam(slug);

  const qc = new QueryClient();
  if (artist) {
    // Seed the queries the client component reads: artist by the slug param,
    // events keyed by that same slug (the client hook reads slugOrId, not the
    // resolved id — matches how it's called from ArtistPublicPage).
    qc.setQueryData(artistKey(slug), artist);
    const events = await fetchArtistEvents(slug);
    if (events) qc.setQueryData(artistEventsKey(slug), events);
  }

  const personJsonLd = artist && {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    url: `${SITE_URL}/artists/${artist.slug}`,
    ...(artist.imageUrl ? { image: artist.imageUrl } : {}),
    ...(artist.description ? { description: artist.description } : {}),
    ...(artist.socialLinks && artist.socialLinks.length > 0
      ? { sameAs: artist.socialLinks.map((s) => s.url) }
      : {}),
  };

  const breadcrumbJsonLd = artist && {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Artistas', item: `${SITE_URL}/artists` },
      { '@type': 'ListItem', position: 3, name: artist.name, item: `${SITE_URL}/artists/${artist.slug}` },
    ],
  };

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      {personJsonLd && <JsonLd data={personJsonLd} />}
      {breadcrumbJsonLd && <JsonLd data={breadcrumbJsonLd} />}
      <ArtistPublicPage slugOrId={slug} />
    </HydrationBoundary>
  );
}
