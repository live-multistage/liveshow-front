import type { Metadata } from 'next';
import { PlatformFiscalPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Notas fiscais' };

export default function Page() {
  return <PlatformFiscalPage />;
}
