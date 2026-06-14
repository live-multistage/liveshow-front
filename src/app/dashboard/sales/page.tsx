import type { Metadata } from 'next';
import styles from '../layout.module.scss';

export const metadata: Metadata = { title: 'Vendas' };

export default function DashboardSalesPage() {
  return <h1 className={styles.pageTitle}>Sales</h1>;
}
