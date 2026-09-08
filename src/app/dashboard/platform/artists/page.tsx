import type { Metadata } from 'next';
import { ArtistCatalogPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Artistas' };

export default function PlatformArtistsPage() {
  return <ArtistCatalogPage />;
}
