import type { Metadata } from 'next';
import { PlatformCouponsPage } from '@/features/platform-admin';

export const metadata: Metadata = { title: 'Plataforma — Cupons' };

export default function Page() {
  return <PlatformCouponsPage />;
}
