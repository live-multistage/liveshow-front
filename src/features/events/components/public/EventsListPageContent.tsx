'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useInfiniteEventsQuery, eventToShow } from '@/features/events';
import type { PaginatedEventsResponse } from '@/features/events';
import { AdBanner } from '@/features/advertisements';
import { EventScheduleCard } from './EventScheduleCard';
import styles from '../../../../app/(public)/events/page.module.scss';

type ChipId = 'all' | 'live' | 'replay' | 'today' | 'weekend' | 'free';
type SortId = 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc' | 'live-first';

function isToday(dateStr: string) {
  const today = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return d.toDateString() === today.toDateString();
}

function isWeekend(dateStr: string) {
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6;
}

export function EventsListPageContent({ initialFirstPage }: { initialFirstPage?: PaginatedEventsResponse }) {
  const t = useTranslations('events.list');

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteEventsQuery('all', initialFirstPage);
  const events = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const SHOWS = useMemo(() => events.map(eventToShow), [events]);

  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState<SortId>('date-asc');
  const [chip, setChip]     = useState<ChipId>('all');

  const liveCount    = useMemo(() => SHOWS.filter((s) => s.isLive).length, [SHOWS]);
  const replayCount  = useMemo(() => SHOWS.filter((s) => s.hasReplay).length, [SHOWS]);
  const todayCount   = useMemo(() => SHOWS.filter((s) => isToday(s.date)).length, [SHOWS]);
  const weekendCount = useMemo(() => SHOWS.filter((s) => isWeekend(s.date)).length, [SHOWS]);
  const freeCount    = useMemo(() => SHOWS.filter((s) => s.price === 0).length, [SHOWS]);

  const CHIPS: { id: ChipId; label: string; count: number; live?: boolean }[] = [
    { id: 'all',     label: t('all'),        count: SHOWS.length },
    { id: 'live',    label: t('liveOnly'),   count: liveCount, live: true },
    { id: 'replay',  label: t('withReplay'), count: replayCount },
    { id: 'today',   label: t('today'),      count: todayCount },
    { id: 'weekend', label: t('weekend'),    count: weekendCount },
    { id: 'free',    label: t('free'),       count: freeCount },
  ];

  const SORTS: { id: SortId; label: string }[] = [
    { id: 'date-asc',   label: t('sortDateAsc') },
    { id: 'date-desc',  label: t('sortDateDesc') },
    { id: 'name-asc',   label: t('sortNameAsc') },
    { id: 'name-desc',  label: t('sortNameDesc') },
    { id: 'live-first', label: t('sortLiveFirst') },
  ];

  let filtered = SHOWS.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.venue.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q);

    const matchChip =
      chip === 'all'     ? true :
      chip === 'live'    ? s.isLive :
      chip === 'replay'  ? s.hasReplay :
      chip === 'today'   ? isToday(s.date) :
      chip === 'weekend' ? isWeekend(s.date) :
      chip === 'free'    ? s.price === 0 :
      true;

    return matchSearch && matchChip;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'date-asc')   return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sort === 'date-desc')  return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sort === 'name-asc')   return a.title.localeCompare(b.title, 'pt-BR');
    if (sort === 'name-desc')  return b.title.localeCompare(a.title, 'pt-BR');
    if (sort === 'live-first') return (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0);
    return 0;
  });

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.eyebrow}>CATÁLOGO</div>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        {/* Search */}
        <div className={styles.searchBox}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7d7d85" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} className={styles.searchClear} aria-label="Limpar busca">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className={styles.chips}>
          {CHIPS.map((c) => {
            const isActive = chip === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setChip(c.id)}
                className={`${styles.chip} ${isActive ? styles.chipActive : styles.chipInactive}`}
              >
                {c.live && <span className={`${styles.chipDot} ${isActive ? styles.chipDotActive : ''}`} />}
                {c.label}
                <span className={isActive ? styles.chipBadgeActive : styles.chipBadgeInactive}>
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort chips */}
        <div className={styles.chips}>
          {SORTS.map((s) => {
            const isActive = sort === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`${styles.chip} ${isActive ? styles.chipActive : styles.chipInactive}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Count row */}
        <div className={styles.countRow}>
          <div className={styles.countLabel}>
            <span className={styles.countNum}>{isLoading ? '—' : filtered.length}</span>
            {' SHOWS ENCONTRADOS'}
          </div>
          <div className={styles.liveCount}>
            <span className={styles.liveCountDot} />
            {liveCount} AO VIVO
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>{t('error')}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>{t('noResults')}</p>
            <p className={styles.emptySubtitle}>Tente outra busca ou remova os filtros.</p>
            <button onClick={() => { setSearch(''); setChip('all'); }} className={styles.clearBtn}>
              {t('clearFilters')}
            </button>
          </div>
        )}

        {/* Ad banner — FEED placement */}
        <AdBanner placement="FEED" className={styles.feedAd} />

        {/* List */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className={styles.cardList}>
            {filtered.map((show) => (
              <EventScheduleCard key={show.id} show={show} />
            ))}
          </div>
        )}

        {/* Load more */}
        {!isLoading && !isError && hasNextPage && (
          <div className={styles.loadMoreRow}>
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className={styles.clearBtn}
            >
              {isFetchingNextPage ? 'CARREGANDO…' : 'CARREGAR MAIS'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
