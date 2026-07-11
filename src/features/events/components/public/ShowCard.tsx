'use client';

import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import type { Show } from '../../types/show';
import { formatPriceRange } from '../../utils/event-formatters';
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

  const isFree = show.priceRange ? show.priceRange.min === 0 && show.priceRange.max === 0 : show.price === 0;
  const priceLabel = purchased ? '—' : formatPriceRange(show.priceRange, show.price);
  const cta = purchased ? t('watch') : show.isLive ? t('watch') : t('details');

  return (
    <div
      className={`${styles.card} ${layout === 'horizontal' ? styles.cardHorizontal : ''}`}
      onClick={() => router.push(`/events/${show.id}`)}
    >
      <div className={styles.imageWrapper}>
        <img src={show.image} alt={show.title} className={styles.image} />
        <div className={styles.imageScrim} />

        {show.isLive ? (
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} />
            AO VIVO
          </div>
        ) : show.hasReplay ? (
          <div className={styles.replayBadge}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M3 12a9 9 0 1 1 3 6.7M3 21v-5h5" />
            </svg>
            REPRISE
          </div>
        ) : null}

        {purchased && !show.isLive && !show.hasReplay && (
          <div className={styles.purchasedBadge}>{t('purchased')}</div>
        )}

        <span className={styles.cameraChip}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7Z" /><rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          {show.cameras.length}
        </span>

        {show.category && (
          <span className={styles.genreLabel}>{show.category.toUpperCase()}</span>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <h3 className={styles.cardTitle}>{show.title}</h3>
          <span className={styles.cardPrice}>{priceLabel}</span>
        </div>

        <div className={styles.metaList}>
          <span className={styles.metaItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2" className={styles.metaIcon}>
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.6" />
            </svg>
            <span className={styles.metaItemTruncate}>{show.venue} · {show.city}</span>
          </span>
          <span className={styles.metaItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2" className={styles.metaIcon}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
            {formatDate(show.date)} · {show.time}
          </span>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.footerChips}>
            {show.tags.length > 0
              ? show.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className={styles.chipTag}>{tag}</span>
                ))
              : (
                <>
                  <span className={styles.chipTag}>SHOW</span>
                  {show.hasReplay && <span className={styles.chipTagReplay}>REPRISE</span>}
                </>
              )
            }
          </div>
          <button
            className={styles.btnCta}
            onClick={(e) => {
              e.stopPropagation();
              router.push(purchased || show.isLive ? `/live/${show.id}` : `/events/${show.id}`);
            }}
          >
            {cta}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
