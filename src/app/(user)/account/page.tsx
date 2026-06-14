import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Minha conta' };

export default function AccountPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Account</h1>
    </div>
  );
}
