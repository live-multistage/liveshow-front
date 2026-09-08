'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { User } from 'lucide-react';
import type { ArtistListItem } from '@live-show/api-contracts';
import { artistHref } from '../utils/slug';
import styles from './ArtistCard.module.scss';

interface Props {
  artist: ArtistListItem;
}

// ArtistListItem still has no city/live flag (see artists.controller.ts
// artistToListItem) — the live badge and city from the design stay omitted
// until the backend projects those fields on GET /artists. genres and
// eventCount are now populated.
export function ArtistCard({ artist }: Props) {
  const t = useTranslations('artists');

  return (
    <Link href={artistHref(artist)} className={styles.card}>
      <div className={styles.cover}>
        {artist.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artist.imageUrl} alt="" className={styles.coverImg} />
        ) : (
          <div className={styles.coverPlaceholder} />
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.avatar}>
          {artist.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.imageUrl} alt={artist.name} className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <User size={22} />
            </div>
          )}
        </div>

        <h3 className={styles.name}>{artist.name}</h3>

        {artist.genres && artist.genres.length > 0 && (
          <div className={styles.genres}>
            {artist.genres.map((genre) => (
              <span key={genre} className={styles.genreChip}>
                {genre}
              </span>
            ))}
          </div>
        )}

        {typeof artist.eventCount === 'number' && (
          <span className={styles.eventCount}>{t('eventsCount', { count: artist.eventCount })}</span>
        )}
      </div>
    </Link>
  );
}
