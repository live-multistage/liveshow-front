'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { eventHref } from '../../../utils/slug';
import type { Show } from '../../../types/show';
import styles from './HomeHero.module.scss';

interface HomeHeroProps {
  show: Show;
}

export function HomeHero({ show }: HomeHeroProps) {
  const metaParts = [
    show.venue,
    show.city,
    `${show.cameras.length} câmera${show.cameras.length !== 1 ? 's' : ''}`,
    'Dolby Atmos',
  ].filter(Boolean);

  return (
    <section className={styles.hero}>
      <div
        className={styles.art}
        style={show.image ? { backgroundImage: `url(${show.image})` } : undefined}
      />
      {show.image && <div className={styles.tint} />}
      <div className={styles.scrim} />

      <div className={styles.content}>
        {show.isLive && (
          <span className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            AO VIVO
          </span>
        )}

        <h1 className={styles.title}>{show.title}</h1>

        {show.viewers != null && (
          <p className={styles.watching}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <path d="M4 12a8 8 0 0 1 16 0" />
              <path d="M7 12a5 5 0 0 1 10 0" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
            </svg>
            <span className={styles.watchingCount}>{show.viewers.toLocaleString('pt-BR')}</span>
            assistindo agora
          </p>
        )}

        <p className={styles.meta}>
          {metaParts.map((part, index) => (
            <span key={part} className={styles.metaItem}>
              {index > 0 && <span className={styles.metaDot} aria-hidden="true" />}
              {part}
            </span>
          ))}
        </p>

        <div className={styles.ctas}>
          {show.isLive ? (
            <Link href={`/live/${show.id}`} className={styles.btnPrimary}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Assistir agora
            </Link>
          ) : (
            <Link href={eventHref(show)} className={styles.btnPrimary}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              {show.price > 0 ? `Comprar ingresso · R$ ${Math.round(show.price)}` : 'Explorar evento'}
            </Link>
          )}
          {show.isLive && (
            <Link href={eventHref(show)} className={styles.btnSecondary}>
              <Info size={18} aria-hidden="true" />
              Detalhes
            </Link>
          )}
        </div>

        <div className={styles.dots} aria-hidden="true">
          <span className={styles.dotActive} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>
    </section>
  );
}
