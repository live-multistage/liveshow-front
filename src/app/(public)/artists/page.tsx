import type { Metadata } from 'next';
import styles from './page.module.scss';

const TITLE = 'Artistas';
const DESCRIPTION = 'Descubra os artistas e atrações que transmitem ao vivo no showon.io.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/artists' },
  openGraph: { type: 'website', url: '/artists', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function ArtistsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Artists</h1>
    </div>
  );
}
