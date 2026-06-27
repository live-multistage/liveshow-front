import type { Metadata } from 'next';
import { SalesDashboard } from '@/features/analytics/components/SalesDashboard';
import styles from '../layout.module.scss';

export const metadata: Metadata = { title: 'Vendas' };

export default function DashboardSalesPage() {
  return (
    <>
      <h1 className={styles.pageTitle}>Vendas</h1>
      <SalesDashboard />
    </>
  );
}
