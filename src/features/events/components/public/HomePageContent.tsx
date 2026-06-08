'use client';

import { useMemo } from 'react';
import { useListEventsQuery, eventToShow } from '@/features/events';
import { HeroSection } from '../../../../app/(public)/_components/HeroSection/HeroSection';
import { LiveForYou } from '../../../../app/(public)/_components/LiveForYou/LiveForYou';
import { ShowsSection } from '../../../../app/(public)/_components/ShowsSection/ShowsSection';
import styles from '../../../../app/(public)/page.module.scss';

export function HomePageContent() {
  const { data: events = [], isLoading } = useListEventsQuery('all');
  const shows = useMemo(() => events.map(eventToShow), [events]);
  const featuredShow = shows[0];
  const liveShows = shows.filter((s) => s.isLive).slice(0, 2);

  if (isLoading || !featuredShow) {
    return (
      <main className={styles.main}>
        <p style={{ color: '#aaa', padding: '40px 0' }}>Carregando eventos...</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.heroRow}>
        <HeroSection show={featuredShow} />
        <LiveForYou shows={liveShows} />
      </div>
      <ShowsSection shows={shows} />
    </main>
  );
}
