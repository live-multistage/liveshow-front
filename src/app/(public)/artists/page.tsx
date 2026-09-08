import type { Metadata } from 'next';
import { ArtistsListPage } from '@/features/artists';
import { fetchArtistsFirstPage } from '@/features/artists/queries/get-artist.server';

const TITLE = 'Artistas';
const DESCRIPTION = 'Descubra os artistas e atrações que transmitem ao vivo no showon.io.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/artists' },
  openGraph: { type: 'website', url: '/artists', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export const revalidate = 300;

export default async function ArtistsPage() {
  // SSR-seed the catalog's first page so it's in the initial HTML — matches
  // the events list page's caching (fetchFeedFirstPage).
  const { items } = await fetchArtistsFirstPage();
  return <ArtistsListPage initialArtists={items} />;
}
