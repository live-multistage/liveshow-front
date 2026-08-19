import type { Metadata } from 'next';
import { PlatformEventsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Diretório de eventos' };

export default function Page() {
  return <PlatformEventsPage />;
}
