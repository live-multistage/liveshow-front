// Shared (server-renderable) presentation for the editorial home. No 'use
// client', no hooks — these render on the server when called from a server
// component (hero/rails/carousels) and only ride into the client bundle where
// GenreGrid (a client island) imports the helpers. Cards are ShowCard
// (size="compact"), the same one the Programação grid uses.
import Link from 'next/link';
import type { Show } from '@/features/events/types/show';
import { formatPriceRange } from '@/features/events/utils/event-formatters';
import { eventHref } from '@/features/events/utils/slug';
import styles from '../EditorialHomeContent.module.scss';

export const LOCALE_CODE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
export const GENRES_PREVIEW_COUNT = 6;

export function fmtPrice(show: Show) {
  return formatPriceRange(show.priceRange, show.price);
}

export function playHref(show: Show) {
  return show.isLive ? `/live/${show.id}` : eventHref(show);
}

export function infoHref(show: Show) {
  return eventHref(show);
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
