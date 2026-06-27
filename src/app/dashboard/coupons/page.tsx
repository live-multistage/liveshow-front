import type { Metadata } from 'next';
import { CouponsDashboard } from '@/features/coupons/components/CouponsDashboard';
import styles from '../layout.module.scss';

export const metadata: Metadata = { title: 'Cupons' };

export default function DashboardCouponsPage() {
  return (
    <>
      <h1 className={styles.pageTitle}>Cupons</h1>
      <CouponsDashboard />
    </>
  );
}
