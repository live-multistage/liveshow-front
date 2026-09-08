'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import type { ArtistListItem } from '@live-show/api-contracts';
import { artistHref } from '../utils/slug';
import styles from './ArtistCard.module.scss';

interface Props {
  artist: ArtistListItem;
}

// ArtistListItem carries only id/slug/name/imageUrl(+optional eventCount) — the
// list endpoint has no genres/city/live flag (see artists.controller.ts
// artistToListItem). Genre chips, city and the live badge from the design are
// omitted here rather than invented; add them once the backend projects those
// fields on GET /artists.
export function ArtistCard({ artist }: Props) {
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

        {typeof artist.eventCount === 'number' && (
          <span className={styles.eventCount}>
            {artist.eventCount} {artist.eventCount === 1 ? 'show' : 'shows'}
          </span>
        )}
      </div>
    </Link>
  );
}
