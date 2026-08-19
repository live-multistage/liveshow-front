import type { Metadata } from 'next';
import { PlatformSettingsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Configurações' };

export default function Page() {
  return <PlatformSettingsPage />;
}
