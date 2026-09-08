'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import type { ArtistListItem } from '@live-show/api-contracts';
import { useArtists } from '../hooks/use-artists';
import { ArtistCard } from '../components/ArtistCard';
import { Skeleton } from '@live-show/design-system';
import styles from './ArtistsListPage.module.scss';

interface Props {
  initialArtists?: ArtistListItem[];
}

// ponytail: no genre/live filter row — GET /artists (ArtistListItem) has no
// genres or live flag to derive chips from (see ArtistCard.tsx comment).
// Name search is the one filter the contract actually supports, so that's
// the only one implemented; add genre chips back once the endpoint carries
// genres per item.
export function ArtistsListPage({ initialArtists }: Props) {
  const t = useTranslations('artists');
  const [query, setQuery] = useState('');
  const { data, isLoading } = useArtists();

  const artists = data?.items ?? initialArtists ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  }, [artists, query]);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>QUEM SOBE AO PALCO</span>
          <h1 className={styles.title}>{t('listTitle')}</h1>
          <p className={styles.subtitle}>{t('listSubtitle')}</p>
        </div>

        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar artista…"
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.filterRow}>
        <span className={styles.resultCount}>
          {filtered.length} {filtered.length === 1 ? 'ARTISTA' : 'ARTISTAS'}
        </span>
      </div>

      {isLoading && !initialArtists ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Search size={28} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Nenhum artista encontrado</p>
          <p className={styles.emptyHint}>Tente buscar por outro nome.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
}
