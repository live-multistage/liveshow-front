import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Compras' };

export default function PurchasesPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Purchases</h1>
    </div>
  );
}
