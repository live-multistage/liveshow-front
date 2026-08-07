// Shared (server-renderable) presentation for the editorial home. No 'use
// client', no hooks — these render on the server when called from a server
// component (hero/rails/carousels) and only ride into the client bundle where
// GenreGrid (a client island) reuses EditorialCard. Images go through
// SmartImage, the one client leaf.
import Link from 'next/link';
import type { Show } from '@/features/events/types/show';
import { formatPriceRange } from '@/features/events/utils/event-formatters';
import { SmartImage } from './SmartImage';
import styles from '../EditorialHomeContent.module.scss';

export const LOCALE_CODE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
export const GENRES_PREVIEW_COUNT = 6;

export function fmtPrice(show: Show) {
  return formatPriceRange(show.priceRange, show.price);
}

export function fmtDate(dateStr: string, localeCode: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(localeCode, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function playHref(show: Show) {
  return show.isLive ? `/live/${show.id}` : `/events/${show.id}`;
}

export function infoHref(show: Show) {
  return `/events/${show.id}`;
}

// ── Ticker ─────────────────────────────────────────────────────────

function TickerItems({ shows }: { shows: Show[] }) {
  return (
    <div className={styles.tickerContent}>
      <span className={styles.tickerAoVivo}>
        <span className={styles.tickerDot} />
        AO VIVO AGORA
      </span>
      {shows.map((s) => (
        <span key={s.id} className={styles.tickerItem}>
          {s.title} · {s.venue} · {s.city}
          {s.viewers ? ` · ${s.viewers.toLocaleString('pt-BR')} assistindo` : ''}
          <span className={styles.tickerSep}>/</span>
        </span>
      ))}
    </div>
  );
}

export function LiveTicker({ shows }: { shows: Show[] }) {
  if (shows.length === 0) return null;
  return (
    <div className={styles.tickerOuter}>
      <div className={styles.tickerTrack}>
        <TickerItems shows={shows} />
        <TickerItems shows={shows} />
      </div>
    </div>
  );
}

// ── Editorial Event Card ────────────────────────────────────────────

export function EditorialCard({ show, localeCode }: { show: Show; localeCode: string }) {
  const priceLabel = fmtPrice(show);
  const isFree = priceLabel === 'Grátis';
  return (
    <div className={styles.eventCard}>
      <Link href={infoHref(show)} className={styles.eventCardLink}>
        <div className={styles.eventImageWrapper}>
          <SmartImage src={show.image} alt={show.title} className={styles.eventImage} />
          <div className={styles.eventImageScrim} />
          <div className={styles.eventBadgesTop}>
            {show.isLive && (
              <span className={styles.eventLiveBadge}>
                <span className={styles.eventLiveDot} />
                AO VIVO
              </span>
            )}
            {show.hasReplay && !show.isLive && (
              <span className={styles.eventRepriseBadge}>REPRISE</span>
            )}
          </div>
          <span className={styles.eventCamBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="13" rx="2" />
              <circle cx="12" cy="13" r="3.4" />
              <path d="M8 7l2-3h4l2 3" />
            </svg>
            {show.cameras.length}
          </span>
        </div>
        <div className={styles.eventContent}>
          <div className={styles.eventHeader}>
            <div className={styles.eventTitle}>{show.title}</div>
            <span className={`${styles.eventPrice} ${isFree ? styles.eventPriceFree : ''}`}>
              {priceLabel}
            </span>
          </div>
          <div className={styles.eventMeta}>
            <span className={styles.eventMetaItem}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" />
              </svg>
              {show.venue} · {show.city}
            </span>
            <span className={styles.eventMetaItem}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
              </svg>
              {fmtDate(show.date, localeCode)} · {show.time}
            </span>
          </div>
        </div>
      </Link>
      <div className={styles.eventActions}>
        <Link href={playHref(show)} className={styles.eventWatchBtn}>
          Assistir
        </Link>
        <Link href={infoHref(show)} className={styles.eventInfoBtn}>
          + INFO
        </Link>
      </div>
    </div>
  );
}
