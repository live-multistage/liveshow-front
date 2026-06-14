import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Configurações' };

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
    </div>
  );
}
