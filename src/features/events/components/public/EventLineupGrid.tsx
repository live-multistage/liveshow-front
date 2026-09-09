'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './EventLineupGrid.module.scss';

interface Artist {
  id: string;
  slug?: string | null;
  name: string;
  imageUrl?: string | null;
}

interface Props {
  artists: Artist[];
}

// "NO EVENTO" — poster-card grid of the event's artists. Genre is not part of
// the artist model, so cards show the name only (the design's genre line has no
// backing data).
export function EventLineupGrid({ artists }: Props) {
  const t = useTranslations('eventDetail');

  if (!artists.length) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionLabel}>{t('lineup')}</h2>
        <span className={styles.countBadge}>{t('lineupCount', { count: artists.length })}</span>
      </div>

      <div className={styles.grid}>
        {artists.map((artist) => (
          <Link
            key={artist.id}
            href={`/artists/${artist.slug || artist.id}`}
            className={styles.card}
          >
            {artist.imageUrl && (
              <img src={artist.imageUrl} alt={artist.name} className={styles.cardImg} />
            )}
            <div className={styles.cardScrim} />
            <div className={styles.cardBody}>
              <div className={styles.cardName}>{artist.name}</div>
              <div className={styles.cardCta}>{t('viewArtist')} →</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
