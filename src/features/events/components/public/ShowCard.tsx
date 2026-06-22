'use client';

import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Clock, Camera } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { Show } from '../../types/show';
import styles from './ShowCard.module.scss';

const LOCALE_CODE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

interface ShowCardProps {
  show: Show;
  purchased?: boolean;
  layout?: 'vertical' | 'horizontal';
}

export function ShowCard({ show, purchased = false, layout = 'vertical' }: ShowCardProps) {
  const router = useRouter();
  const t = useTranslations('showCard');
  const locale = useLocale();
  const localeCode = LOCALE_CODE[locale] ?? 'pt-BR';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(localeCode, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatPrice = (price: number) =>
    price.toLocaleString(localeCode, { style: 'currency', currency: 'BRL' });

  const isFree = show.price === 0;
  const cta = purchased ? t('watch') : show.isLive ? t('watch') : t('details');

  return (
    <div
      className={`${styles.card} ${layout === 'horizontal' ? styles.cardHorizontal : ''}`}
      onClick={() => router.push(`/events/${show.id}`)}
    >
      {/* Image */}
      <div className={styles.imageWrapper}>
        <img src={show.image} alt={show.title} className={styles.image} />
        <div className={styles.imageScrim} />

        <div className={styles.badgesTopLeft}>
          {show.isLive && (
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              AO VIVO
            </span>
          )}
          {purchased && !show.isLive && (
            <span className={styles.purchasedBadge}>{t('purchased')}</span>
          )}
        </div>

        <span className={styles.cameraChip}>
          <Camera size={12} />
          {show.cameras.length}
        </span>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <h3 className={styles.cardTitle}>{show.title}</h3>
          <span className={`${styles.cardPrice} ${isFree ? styles.cardPriceFree : ''}`}>
            {purchased ? '—' : formatPrice(show.price)}
          </span>
        </div>

        <div className={styles.metaList}>
          <span className={styles.metaItem}>
            <MapPin size={13} className={styles.metaIconLocation} />
            <span className={styles.metaItemTruncate}>{show.venue} · {show.city}</span>
          </span>
          <span className={styles.metaRow}>
            <span className={styles.metaItem}>
              <Calendar size={13} />
              {formatDate(show.date)}
            </span>
            <span className={styles.metaItem}>
              <Clock size={13} />
              {show.time}
            </span>
          </span>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.footerChips}>
            <span className={styles.chipShow}>SHOW</span>
            {show.hasReplay && <span className={styles.chipReprise}>REPRISE</span>}
          </div>
          <button
            className={styles.btnCta}
            onClick={(e) => {
              e.stopPropagation();
              router.push(purchased || show.isLive ? `/live/${show.id}` : `/events/${show.id}`);
            }}
          >
            {cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
