'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Chip } from '@live-show/design-system';
import type { Show } from '@/features/events/types/show';
import { SectionHeader } from '@/shared/components/SectionHeader/SectionHeader';
import { GENRES_PREVIEW_COUNT } from './editorial-parts';
import { ShowCard } from '../ShowCard';
import styles from '../EditorialHomeContent.module.scss';

// Sentinel for "no filter" — never the translated "Todos" label, so the
// filter state doesn't depend on locale.
const ALL_KEY = '__all__';

const isRealCategory = (show: Show) => show.categoryKey !== 'OTHER';

// The only interactive island on the home: the genre filter + the grid it
// drives. Everything above it (hero, rails, carousels) is server-rendered.
export function GenreGrid({ shows }: { shows: Show[] }) {
  const t = useTranslations('home');
  const [activeGenre, setActiveGenre] = useState<string>(ALL_KEY);
  const [genresExpanded, setGenresExpanded] = useState(false);

  const genres = useMemo(
    () => [...new Set(shows.filter(isRealCategory).map((s) => s.category))].filter(Boolean),
    [shows],
  );

  // The active genre may no longer exist (its shows sold out / were filtered
  // out server-side on a fresh render) — fall back to "all" instead of
  // showing a stuck empty state for a category the chip row no longer lists.
  const effectiveGenre = genres.includes(activeGenre) ? activeGenre : ALL_KEY;

  const filtered = useMemo(
    () => (effectiveGenre === ALL_KEY ? shows : shows.filter((s) => s.category === effectiveGenre)),
    [shows, effectiveGenre],
  );

  return (
    <section className={styles.gridSection} aria-labelledby="home-all-shows-heading">
      <SectionHeader title={t('allShows')} titleId="home-all-shows-heading" seeAllHref="/events" />

      {genres.length >= 2 && (
        <div className={styles.genreRow}>
          <span className={styles.genreLabel}>{t('filterByCategory')}</span>
          <Chip
            variant={effectiveGenre === ALL_KEY ? 'active' : 'default'}
            className={styles.genreChipTouch}
            onClick={() => setActiveGenre(ALL_KEY)}
          >
            {t('all')}
          </Chip>
          {/* Cap the visible chips — 13 choices before the grid is a wall.
              The active genre always stays visible even when collapsed. */}
          {(genresExpanded
            ? genres
            : genres.filter((g, i) => i < GENRES_PREVIEW_COUNT || g === effectiveGenre)
          ).map((g) => (
            <Chip
              key={g}
              variant={g === effectiveGenre ? 'active' : 'default'}
              className={styles.genreChipTouch}
              onClick={() => setActiveGenre(g)}
            >
              {g}
            </Chip>
          ))}
          {!genresExpanded && genres.length > GENRES_PREVIEW_COUNT && (
            <Chip
              variant="default"
              className={styles.genreChipTouch}
              onClick={() => setGenresExpanded(true)}
            >
              {t('moreGenres', { count: genres.length - GENRES_PREVIEW_COUNT })}
            </Chip>
          )}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className={styles.eventGrid}>
          {filtered.map((show) => (
            <ShowCard key={show.id} show={show} size="compact" />
          ))}
        </div>
      ) : (
        <div className={styles.emptyGrid}>
          {effectiveGenre === ALL_KEY ? t('noShows') : t('noShowsInCategory')}
        </div>
      )}
    </section>
  );
}
