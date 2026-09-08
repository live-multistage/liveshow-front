import type { Metadata } from 'next';
import { PlatformArtistApplicationsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Candidaturas a artista' };

export default function Page() {
  return <PlatformArtistApplicationsPage />;
}
