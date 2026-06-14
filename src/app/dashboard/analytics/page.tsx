import type { Metadata } from 'next';
import styles from '../layout.module.scss';

export const metadata: Metadata = { title: 'Análises' };

export default function DashboardAnalyticsPage() {
  return <h1 className={styles.pageTitle}>Analytics</h1>;
}
