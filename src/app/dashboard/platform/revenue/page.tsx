import type { Metadata } from 'next';
import { PlatformRevenuePage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Receita' };

export default function Page() {
  return <PlatformRevenuePage />;
}
