'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Show } from '@/features/events/types/show';
import { EditorialCard, GENRES_PREVIEW_COUNT } from './editorial-parts';
import styles from '../EditorialHomeContent.module.scss';

// The only interactive island on the home: the genre filter + the grid it
// drives. Everything above it (hero, rails, carousels) is server-rendered.
export function GenreGrid({ shows, localeCode }: { shows: Show[]; localeCode: string }) {
  const [activeGenre, setActiveGenre] = useState('Todos');
  const [genresExpanded, setGenresExpanded] = useState(false);

  const genres = useMemo(() => {
    const unique = [...new Set(shows.map((s) => s.category))].filter(Boolean);
    return ['Todos', ...unique];
  }, [shows]);

  const filtered = useMemo(
    () => (activeGenre === 'Todos' ? shows : shows.filter((s) => s.category === activeGenre)),
    [shows, activeGenre],
  );

  return (
    <div className={styles.gridSection}>
      <div className={styles.genreRow}>
        <span className={styles.genreLabel}>Filtrar por categoria</span>
        {/* Cap the visible chips — 13 choices before the grid is a wall.
            The active genre always stays visible even when collapsed. */}
        {(genresExpanded
          ? genres
          : genres.filter((g, i) => i < GENRES_PREVIEW_COUNT || g === activeGenre)
        ).map((g) => (
          <button
            key={g}
            onClick={() => setActiveGenre(g)}
            className={`${styles.genreChip} ${g === activeGenre ? styles.genreChipActive : styles.genreChipInactive}`}
          >
            {g}
          </button>
        ))}
        {!genresExpanded && genres.length > GENRES_PREVIEW_COUNT && (
          <button
            onClick={() => setGenresExpanded(true)}
            className={`${styles.genreChip} ${styles.genreChipInactive}`}
          >
            +{genres.length - GENRES_PREVIEW_COUNT} mais
          </button>
        )}
      </div>

      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>PRÓXIMOS SHOWS</div>
          <div className={styles.sectionTitle}>Em alta na LIVESHOW</div>
        </div>
        <Link href="/events" className={styles.sectionMore}>
          VER TODOS →
        </Link>
      </div>

      {filtered.length > 0 ? (
        <div className={styles.eventGrid}>
          {filtered.map((show) => (
            <EditorialCard key={show.id} show={show} localeCode={localeCode} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyGrid}>
          Nenhum evento neste gênero ainda — em breve.
        </div>
      )}
    </div>
  );
}
