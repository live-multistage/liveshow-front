import type { Metadata } from 'next';
import { applySeo, getSeoForPage } from '@/features/seo';
import { PageJsonLd } from '@/features/seo/components/PageJsonLd';
import { requireFeatureFlag } from '@/features/feature-flags';
import { ArtistApplicationContent } from '@/features/artists/pages/ArtistApplicationPage';

const BASE_METADATA: Metadata = {
  title: 'Candidate-se como artista',
  description: 'Envie sua candidatura para ganhar um perfil de artista e transmitir seus shows.',
  alternates: { canonical: '/artists/apply' },
  robots: { index: false },
};

export async function generateMetadata(): Promise<Metadata> {
  return applySeo(BASE_METADATA, await getSeoForPage('artists.apply', '/artists/apply'), {});
}

export default async function ArtistApplicationPage() {
  await requireFeatureFlag('artist_applications');
  return (
    <>
      <ArtistApplicationContent />
      <PageJsonLd pageKey="artists.apply" path="/artists/apply" />
    </>
  );
}
