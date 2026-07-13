'use client';

import Link from 'next/link';
import { Eye } from 'lucide-react';
import type { Show } from '../../../types/show';
import styles from './HomeLiveStrip.module.scss';

interface HomeLiveStripProps {
  shows: Show[];
}

export function HomeLiveStrip({ shows }: HomeLiveStripProps) {
  if (shows.length === 0) return null;

  return (
    <section className={styles.strip}>
      <div className={styles.header}>
        <span className={styles.pulseDot} />
        <h2 className={styles.heading}>Acontecendo agora</h2>
      </div>

      <div className={styles.grid}>
        {shows.map((show) => (
          <Link key={show.id} href={`/live/${show.id}`} className={styles.card}>
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
          </Link>
        ))}
      </div>
    </section>
  );
}
