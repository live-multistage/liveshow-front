import type { Metadata } from 'next';
import { PlatformCouponsPage } from '@/features/platform-admin';
import { requireFeatureFlag } from '@/features/feature-flags';

export const metadata: Metadata = { title: 'Plataforma — Cupons' };

export default async function Page() {
  await requireFeatureFlag('coupons');
  return <PlatformCouponsPage />;
}
