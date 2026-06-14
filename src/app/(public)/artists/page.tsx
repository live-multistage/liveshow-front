import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Artistas' };

export default function ArtistsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Artists</h1>
    </div>
  );
}
