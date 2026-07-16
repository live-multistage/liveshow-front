import type { Metadata } from 'next';
import { PlatformStreamsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Saúde dos streams' };

export default function Page() {
  return <PlatformStreamsPage />;
}
