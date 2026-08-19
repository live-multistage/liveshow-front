import type { Metadata } from 'next';
import { PlatformAdsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Anúncios' };

export default function Page() {
  return <PlatformAdsPage />;
}
