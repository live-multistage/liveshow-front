import type { Metadata } from 'next';
import { PlatformOrganizerApplicationsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Candidaturas a organizador' };

export default function Page() {
  return <PlatformOrganizerApplicationsPage />;
}
