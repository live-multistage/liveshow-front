import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Sobre' };

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About</h1>
    </div>
  );
}
