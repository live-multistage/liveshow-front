'use client';

import type { Show } from '@/features/events/types/show';
import { ShowCard } from '@/features/events';
import styles from './LiveForYou.module.scss';

interface LiveForYouProps {
  shows: Show[];
}

export function LiveForYou({ shows }: LiveForYouProps) {
  if (shows.length === 0) return null;

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Live for you</h2>

      <div className={styles.list}>
        {shows.map((show) => (
          <ShowCard key={show.id} show={show} layout="horizontal" />
        ))}
      </div>
    </div>
  );
}
