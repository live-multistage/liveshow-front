'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useListEventsQuery, eventToShow, useEventsPriceMap, formatPriceRange } from '@/features/events';
import type { Show } from '@/features/events/types/show';
import styles from './EditorialHomeContent.module.scss';

const LOCALE_CODE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

function fmtPrice(show: Show) {
  return formatPriceRange(show.priceRange, show.price);
}

function fmtDate(dateStr: string, localeCode: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(localeCode, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
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

function LiveTicker({ shows }: { shows: Show[] }) {
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

// ── Live Rail Item ──────────────────────────────────────────────────

function LiveRailItem({ show, localeCode, onClick }: { show: Show; localeCode: string; onClick: () => void }) {
  return (
    <div className={styles.liveItem} onClick={onClick}>
      <div className={styles.liveThumbWrapper}>
        <img src={show.image} alt={show.title} className={styles.liveThumb} />
        <div className={styles.liveThumbOverlay} />
        <span className={styles.liveItemBadge}>
          <span className={styles.liveBadgeDot} />
          AO VIVO
        </span>
      </div>
      <div className={styles.liveItemBody}>
        <div className={styles.liveItemTop}>
          <div className={styles.liveItemTitle}>{show.title}</div>
          <div className={styles.liveItemVenue}>{show.venue} · {show.city}</div>
        </div>
        <div className={styles.liveItemFooter}>
          <span className={styles.liveItemViewers}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" /><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            </svg>
            {show.viewers ? show.viewers.toLocaleString('pt-BR') : '—'} assistindo
          </span>
          <span className={styles.liveItemPrice}>{fmtPrice(show)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Editorial Event Card ────────────────────────────────────────────

function EditorialCard({
  show,
  localeCode,
  onWatch,
  onInfo,
}: {
  show: Show;
  localeCode: string;
  onWatch: () => void;
  onInfo: () => void;
}) {
  const priceLabel = fmtPrice(show);
  const isFree = priceLabel === 'Grátis';
  return (
    <div className={styles.eventCard} onClick={onInfo}>
      <div className={styles.eventImageWrapper}>
        <img src={show.image} alt={show.title} className={styles.eventImage} />
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
        <div className={styles.eventActions}>
          <button
            className={styles.eventWatchBtn}
            onClick={(e) => { e.stopPropagation(); onWatch(); }}
          >
            Assistir
          </button>
          <button
            className={styles.eventInfoBtn}
            onClick={(e) => { e.stopPropagation(); onInfo(); }}
          >
            + INFO
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────

export function EditorialHomeContent() {
  const router = useRouter();
  const locale = useLocale();
  const localeCode = LOCALE_CODE[locale] ?? 'pt-BR';

  const [activeGenre, setActiveGenre] = useState('Todos');

  const { data: events = [], isLoading } = useListEventsQuery('all');
  const eventIds = useMemo(() => events.map((e) => e.id), [events]);
  const priceMap = useEventsPriceMap(eventIds);
  const shows = useMemo(
    () => events.map((e) => ({ ...eventToShow(e), priceRange: priceMap[e.id] ?? undefined })),
    [events, priceMap],
  );

  const liveShows = useMemo(() => shows.filter((s) => s.isLive), [shows]);
  const tickerShows = useMemo(() => liveShows.length > 0 ? liveShows : shows.slice(0, 4), [liveShows, shows]);
  const featured = useMemo(() => liveShows[0] ?? shows[0] ?? null, [liveShows, shows]);

  const genres = useMemo(() => {
    const unique = [...new Set(shows.map((s) => s.genre))].filter(Boolean);
    return ['Todos', ...unique];
  }, [shows]);

  const filtered = useMemo(
    () => (activeGenre === 'Todos' ? shows : shows.filter((s) => s.genre === activeGenre)),
    [shows, activeGenre],
  );

  const goWatch = (show: Show) =>
    router.push(show.isLive ? `/live/${show.id}` : `/events/${show.id}`);
  const goInfo = (show: Show) => router.push(`/events/${show.id}`);
  const goTickets = (show: Show) => router.push(`/events/${show.id}`);

  if (isLoading) {
    return <div className={styles.loading}><span className={styles.spinner} /></div>;
  }

  return (
    <div className={styles.page}>

      <div className={styles.inner}>
        {/* Hero + Live Rail */}
        {featured && (
          <div className={styles.heroGrid}>
            {/* Featured hero card */}
            <div className={styles.heroCard}>
              <img src={featured.image} alt={featured.title} className={styles.heroImage} />
              <div className={styles.heroOverlay} />

              <div className={styles.heroBadges}>
                <span className={styles.heroFeaturedBadge}>EM DESTAQUE</span>
                <span className={styles.heroCamBadge}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="13" rx="2" />
                    <circle cx="12" cy="13" r="3.4" />
                    <path d="M8 7l2-3h4l2 3" />
                  </svg>
                  {featured.cameras.length}
                </span>
              </div>

              <button className={styles.heroPlayBtn} onClick={() => goWatch(featured)} aria-label="Assistir">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>

              <div className={styles.heroContent}>
                <div className={styles.heroGenre}>
                  {featured.genre.toUpperCase()} · {featured.venue.toUpperCase()}
                </div>
                <h1 className={styles.heroTitle}>{featured.title}</h1>
                <div className={styles.heroMeta}>
                  <span className={styles.heroMetaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" /><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    </svg>
                    {featured.viewers ? `${featured.viewers.toLocaleString('pt-BR')} assistindo` : '0 assistindo'}
                  </span>
                  <span className={styles.heroMetaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="13" rx="2" />
                      <circle cx="12" cy="13" r="3.4" />
                      <path d="M8 7l2-3h4l2 3" />
                    </svg>
                    {featured.cameras.length} câmeras
                  </span>
                  <span className={styles.heroMetaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
                    </svg>
                    {fmtDate(featured.date, localeCode)}
                  </span>
                </div>
                <div className={styles.heroActions}>
                  <button className={styles.heroWatchBtn} onClick={() => goWatch(featured)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Assistir agora
                  </button>
                  <button className={styles.heroTicketsBtn} onClick={() => goTickets(featured)}>
                    Ingressos ·{' '}
                    <span className={styles.heroTicketsPrice}>{fmtPrice(featured)}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live rail */}
            <div className={styles.liveRail}>
              <div className={styles.liveRailHeader}>
                <h2 className={styles.liveRailTitle}>Ao Vivo para você</h2>
                {liveShows.length > 0 && (
                  <span className={styles.liveRailBadge}>
                    <span className={styles.liveDot} />
                    {liveShows.length} AO VIVO
                  </span>
                )}
              </div>
              <div className={styles.liveItems}>
                {liveShows.slice(0, 3).map((show) => (
                  <LiveRailItem
                    key={show.id}
                    show={show}
                    localeCode={localeCode}
                    onClick={() => goWatch(show)}
                  />
                ))}
                {liveShows.length === 0 && (
                  <div className={styles.liveRailEmpty}>Nenhum show ao vivo no momento.</div>
                )}
              </div>
              <button
                className={styles.liveRailMore}
                onClick={() => router.push('/events')}
              >
                VER TODA A PROGRAMAÇÃO AO VIVO →
              </button>
            </div>
          </div>
        )}

        {/* Genre filter + grid */}
        <div className={styles.gridSection}>
          {/* Genre chips */}
          <div className={styles.genreRow}>
            <span className={styles.genreLabel}>Filtrar por gênero</span>
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGenre(g)}
                className={`${styles.genreChip} ${g === activeGenre ? styles.genreChipActive : styles.genreChipInactive}`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Section header */}
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionEyebrow}>PRÓXIMOS SHOWS</div>
              <div className={styles.sectionTitle}>Em alta na LIVESHOW</div>
            </div>
            <button className={styles.sectionMore} onClick={() => router.push('/events')}>
              VER TODOS →
            </button>
          </div>

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className={styles.eventGrid}>
              {filtered.map((show) => (
                <EditorialCard
                  key={show.id}
                  show={show}
                  localeCode={localeCode}
                  onWatch={() => goWatch(show)}
                  onInfo={() => goInfo(show)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyGrid}>
              Nenhum evento neste gênero ainda — em breve.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
