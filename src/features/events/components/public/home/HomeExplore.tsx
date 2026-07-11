'use client';

import type { Show } from '../../../types/show';
import { HomePosterCard } from './HomePosterCard';
import styles from './HomeExplore.module.scss';

const SPAN_PLAN = [
  { gridColumn: 'span 2', gridRow: 'span 2', titleSize: '30px' },
  { gridColumn: 'span 2', gridRow: 'span 1', titleSize: '20px' },
  { gridColumn: 'span 1', gridRow: 'span 1', titleSize: '16px' },
  { gridColumn: 'span 1', gridRow: 'span 1', titleSize: '16px' },
  { gridColumn: 'span 2', gridRow: 'span 1', titleSize: '20px' },
  { gridColumn: 'span 2', gridRow: 'span 1', titleSize: '20px' },
];

interface HomeExploreProps {
  shows: Show[];
  genres: string[];
  activeGenre: string;
  onGenreChange: (genre: string) => void;
}

export function HomeExplore({ shows, genres, activeGenre, onGenreChange }: HomeExploreProps) {
  return (
    <section className={styles.section}>
      <div className={styles.topBar}>
        <h2 className={styles.heading}>Explorar shows</h2>
        <div className={styles.chips}>
          {genres.map((genre) => (
            <button
              key={genre}
              className={genre === activeGenre ? styles.chipActive : styles.chip}
              onClick={() => onGenreChange(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {shows.length > 0 ? (
        <div className={styles.grid}>
          {shows.map((show, i) => (
            <HomePosterCard
              key={show.id}
              show={show}
              span={SPAN_PLAN[i % SPAN_PLAN.length]}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Nenhum evento nesta categoria ainda — em breve.</div>
      )}
    </section>
  );
}
