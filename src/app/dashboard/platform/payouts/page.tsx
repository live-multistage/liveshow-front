import type { Metadata } from 'next';
import { PlatformPayoutsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Payouts & saldos' };

export default function Page() {
  return <PlatformPayoutsPage />;
}
