import type { Metadata } from 'next';
import { PlatformAdPartnershipsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Parcerias de anúncios' };

export default function Page() {
  return <PlatformAdPartnershipsPage />;
}
