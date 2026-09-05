'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { Show } from '../../types/show';
import { formatPriceRange } from '../../utils/event-formatters';
import { eventHref } from '../../utils/slug';
import styles from './EventScheduleCard.module.scss';

const LOCALE_CODE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

// Horizontal schedule card for the /events catalog. Kept separate from
// ShowCard because ShowCard's `layout="horizontal"` is reused by LiveForYou
// and this design would regress it.
export function EventScheduleCard({ show }: { show: Show }) {
  const t = useTranslations('showCard');
  const locale = useLocale();
  const localeCode = LOCALE_CODE[locale] ?? 'pt-BR';

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString(localeCode, {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  const isFree = show.priceRange
    ? show.priceRange.min === 0 && show.priceRange.max === 0
    : show.price === 0;
  const priceLabel = formatPriceRange(show.priceRange, show.price);
  const cta = show.isLive ? t('watch') : t('details');
  const href = show.isLive ? `/live/${show.id}` : eventHref(show);

  return (
    <Link href={href} className={styles.card} aria-label={show.title}>
      <div className={styles.thumb}>
        <img src={show.image} alt="" className={styles.image} />
        <div className={styles.scrim} />

        {show.isLive ? (
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            AO VIVO
          </span>
        ) : show.hasReplay ? (
          <span className={styles.replayBadge}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M3 12a9 9 0 1 1 3 6.7M3 21v-5h5" />
            </svg>
            REPRISE
          </span>
        ) : null}

        <span className={styles.cameraChip}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7Z" /><rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          {show.cameras.length}
        </span>
      </div>

      <div className={styles.content}>
        {show.category && <div className={styles.category}>{show.category.toUpperCase()}</div>}
        <h3 className={styles.title}>{show.title}</h3>
        <div className={styles.dateLine}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2" className={styles.dateIcon}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
          </svg>
          <span className={styles.dateText}>{formatDate(show.date)} · {show.time}</span>
        </div>

        <div className={styles.bottomRow}>
          <span className={`${styles.price} ${isFree ? styles.priceFree : ''}`}>{priceLabel}</span>
          <span className={styles.cta}>
            {cta}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
