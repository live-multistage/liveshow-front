'use client';

import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import type { Show } from '../../../types/show';
import styles from './HomeLiveStrip.module.scss';

interface HomeLiveStripProps {
  shows: Show[];
}

export function HomeLiveStrip({ shows }: HomeLiveStripProps) {
  const router = useRouter();

  if (shows.length === 0) return null;

  return (
    <section className={styles.strip}>
      <div className={styles.header}>
        <span className={styles.pulseDot} />
        <h2 className={styles.heading}>Acontecendo agora</h2>
      </div>

      <div className={styles.grid}>
        {shows.map((show) => (
          <div
            key={show.id}
            className={styles.card}
            onClick={() => router.push(`/live/${show.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && router.push(`/live/${show.id}`)}
          >
            <div
              className={styles.cardArt}
              style={{ backgroundImage: `url(${show.image})` }}
            />
            <div className={styles.cardOverlay} />

            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              AO VIVO
            </span>

            <div className={styles.cardInfo}>
              <div className={styles.cardTitle}>{show.title}</div>
              <div className={styles.cardMeta}>
                <span>{show.city}</span>
                {show.viewers != null && (
                  <span className={styles.viewers}>
                    <Eye size={12} />
                    {show.viewers.toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
