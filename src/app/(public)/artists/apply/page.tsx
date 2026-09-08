import type { Metadata } from 'next';
import { requireFeatureFlag } from '@/features/feature-flags';
import { ArtistApplicationContent } from '@/features/artists/pages/ArtistApplicationPage';

export const metadata: Metadata = {
  title: 'Candidate-se como artista',
  description: 'Envie sua candidatura para ganhar um perfil de artista e transmitir seus shows.',
  alternates: { canonical: '/artists/apply' },
  robots: { index: false },
};

export default async function ArtistApplicationPage() {
  await requireFeatureFlag('artist_applications');
  return <ArtistApplicationContent />;
}
