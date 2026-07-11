'use client';

import { useMemo, useState } from 'react';
import { useListEventsQuery, eventToShow } from '@/features/events';
import type { EventResponse } from '@/features/events';
import { HomeHero } from './home/HomeHero';
import { HomeLiveStrip } from './home/HomeLiveStrip';
import { HomeExplore } from './home/HomeExplore';
import styles from './HomePageContent.module.scss';

interface Props {
  initialEvents?: EventResponse[];
}

export function HomePageContent({ initialEvents }: Props) {
  const [activeGenre, setActiveGenre] = useState('Todos');
  const { data: events = [], isLoading } = useListEventsQuery('all', initialEvents);

  const shows = useMemo(() => events.map(eventToShow), [events]);

  const featuredShow = shows[0] ?? null;
  const liveShows = useMemo(() => shows.filter((s) => s.isLive).slice(0, 2), [shows]);

  const genres = useMemo(() => {
    const unique = [...new Set(shows.map((s) => s.category))].filter(Boolean);
    return ['Todos', ...unique];
  }, [shows]);

  const filtered = useMemo(
    () => (activeGenre === 'Todos' ? shows : shows.filter((s) => s.category === activeGenre)),
    [shows, activeGenre],
  );

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} />
      </div>
    );
  }

  if (!featuredShow) {
    return (
      <div className={styles.empty}>
        <p>Nenhum show disponível no momento.</p>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <HomeHero show={featuredShow} />
      <HomeLiveStrip shows={liveShows} />
      <HomeExplore
        shows={filtered}
        genres={genres}
        activeGenre={activeGenre}
        onGenreChange={setActiveGenre}
      />
    </main>
  );
}
