'use client';

import Link from 'next/link';
import { Camera } from 'lucide-react';
import type { Show } from '../../../types/show';
import styles from './HomePosterCard.module.scss';

interface SpanPlan {
  gridColumn: string;
  gridRow: string;
  titleSize: string;
}

interface HomePosterCardProps {
  show: Show;
  span: SpanPlan;
}

export function HomePosterCard({ show, span }: HomePosterCardProps) {
  const priceLabel = show.price === 0 ? 'Gratuito' : `R$ ${Math.round(show.price)}`;
  const isFree = show.price === 0;

  return (
    <Link
      href={`/events/${show.id}`}
      className={styles.card}
      style={{ gridColumn: span.gridColumn, gridRow: span.gridRow }}
    >
      <div className={styles.art} style={{ backgroundImage: `url(${show.image})` }} />
      <div className={styles.overlay} />

      <div className={styles.topRow}>
        <div className={styles.badges}>
          {show.isLive && (
            <span className={styles.badgeLive}>
              <span className={styles.liveDot} />
              AO VIVO
            </span>
          )}
          {show.hasReplay && !show.isLive && (
            <span className={styles.badgeReplay}>REPRISE</span>
          )}
        </div>
        <span className={styles.camerasBadge}>
          <Camera size={11} />
          {show.cameras.length}
        </span>
      </div>

      <div className={styles.bottom}>
        <div className={styles.genre}>{show.category}</div>
        <div className={styles.title} style={{ fontSize: span.titleSize }}>
          {show.title}
        </div>
        <div className={styles.footer}>
          <span className={styles.meta}>
            {show.city} · {show.date}
          </span>
          <span className={isFree ? styles.priceFree : styles.price}>{priceLabel}</span>
        </div>
      </div>
    </Link>
  );
}
