'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { ArtistListItem } from '@live-show/api-contracts';
import { useArtists } from '../hooks/use-artists';
import { ArtistCard } from '../components/ArtistCard';
import { Skeleton } from '@live-show/design-system';
import styles from './ArtistsListPage.module.scss';

interface Props {
  initialArtists?: ArtistListItem[];
}

// ponytail: no live filter chip — GET /artists (ArtistListItem) still has no
// live flag to derive it from. Genre chips are derived client-side from the
// loaded page's distinct genres; add server-side genre filtering if the
// artist count ever outgrows a single page.
export function ArtistsListPage({ initialArtists }: Props) {
  const t = useTranslations('artists');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const { data, isLoading } = useArtists();

  const artists = data?.items ?? initialArtists ?? [];
  const genres = useMemo(
    () => [...new Set(artists.flatMap((a) => a.genres ?? []))].sort(),
    [artists],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return artists.filter((a) => {
      const matchesQuery = !q || a.name.toLowerCase().includes(q);
      const matchesGenre = !genre || (a.genres ?? []).includes(genre);
      return matchesQuery && matchesGenre;
    });
  }, [artists, query, genre]);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>QUEM SOBE AO PALCO</span>
          <h1 className={styles.title}>{t('listTitle')}</h1>
          <p className={styles.subtitle}>{t('listSubtitle')}</p>
          <Link href="/artists/apply" className={styles.applyLink}>
            Você é artista? Candidate-se →
          </Link>
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

      {genres.length > 0 && (
        <div className={styles.genreFilterRow}>
          <button
            type="button"
            onClick={() => setGenre(null)}
            className={genre === null ? styles.genreChipActive : styles.genreChipFilter}
          >
            TODOS
          </button>
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g)}
              className={genre === g ? styles.genreChipActive : styles.genreChipFilter}
            >
              {g}
            </button>
          ))}
        </div>
      )}

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
