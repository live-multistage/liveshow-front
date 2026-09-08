import type { Metadata } from 'next';
import { ArtistDashboardPage } from '@/features/artists/pages/ArtistDashboardPage';

export const metadata: Metadata = { title: 'Artista' };

export default function DashboardArtistsPage() {
  return <ArtistDashboardPage />;
}
