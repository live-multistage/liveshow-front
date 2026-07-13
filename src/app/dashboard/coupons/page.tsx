import type { Metadata } from 'next';
import { CouponsDashboard } from '@/features/coupons/components/CouponsDashboard';

export const metadata: Metadata = { title: 'Cupons' };

export default function DashboardCouponsPage() {
  return <CouponsDashboard />;
}
