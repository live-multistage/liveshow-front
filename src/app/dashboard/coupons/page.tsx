import type { Metadata } from 'next';
import { CouponsDashboard } from '@/features/coupons/components/CouponsDashboard';
import { requireFeatureFlag } from '@/features/feature-flags';

export const metadata: Metadata = { title: 'Cupons' };

export default async function DashboardCouponsPage() {
  await requireFeatureFlag('coupons');
  return <CouponsDashboard />;
}
