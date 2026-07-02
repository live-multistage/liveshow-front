'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useListEventsQuery, eventToShow, useEventsPriceMap } from '@/features/events';
import { AdBanner } from '@/features/advertisements';
import { ShowCard } from './ShowCard';
import styles from '../../../../app/(public)/events/page.module.scss';

type ChipId = 'all' | 'live' | 'replay' | 'today' | 'weekend' | 'free';
type ViewMode = 'grid' | 'list';

const SORT_OPTIONS = [
  { id: 'date-asc',   label: 'DATA (MAIS PRÓXIMA)' },
  { id: 'date-desc',  label: 'DATA (MAIS DISTANTE)' },
  { id: 'name-asc',   label: 'NOME (A → Z)' },
  { id: 'name-desc',  label: 'NOME (Z → A)' },
  { id: 'live-first', label: 'AO VIVO PRIMEIRO' },
];

function isToday(dateStr: string) {
  const today = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return d.toDateString() === today.toDateString();
}

function isWeekend(dateStr: string) {
  const day = new Date(dateStr + 'T00:00:00').getDay();
  return day === 0 || day === 6;
}

export function EventsListPageContent() {
  const t = useTranslations('events.list');

  const { data: events = [], isLoading, isError } = useListEventsQuery('all');
  const eventIds = useMemo(() => events.map((e) => e.id), [events]);
  const priceMap = useEventsPriceMap(eventIds);
  const SHOWS = useMemo(
    () => events.map((e) => ({ ...eventToShow(e), priceRange: priceMap[e.id] ?? undefined })),
    [events, priceMap],
  );

  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState('date-asc');
  const [chip, setChip]     = useState<ChipId>('all');
  const [view, setView]     = useState<ViewMode>('grid');

  const liveCount    = useMemo(() => SHOWS.filter((s) => s.isLive).length, [SHOWS]);
  const replayCount  = useMemo(() => SHOWS.filter((s) => s.hasReplay).length, [SHOWS]);
  const todayCount   = useMemo(() => SHOWS.filter((s) => isToday(s.date)).length, [SHOWS]);
  const weekendCount = useMemo(() => SHOWS.filter((s) => isWeekend(s.date)).length, [SHOWS]);
  const freeCount    = useMemo(() => SHOWS.filter((s) => s.price === 0).length, [SHOWS]);

  const CHIPS: { id: ChipId; label: string; count: number; icon: React.ReactNode }[] = [
    {
      id: 'all', label: 'TODOS', count: SHOWS.length,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: 'live', label: 'AO VIVO', count: liveCount,
      icon: <span className={styles.chipLiveDot} />,
    },
    {
      id: 'replay', label: 'COM REPRISE', count: replayCount,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 1 3 6.7M3 21v-5h5" />
        </svg>
      ),
    },
    {
      id: 'today', label: 'HOJE', count: todayCount,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      ),
    },
    {
      id: 'weekend', label: 'FIM DE SEMANA', count: weekendCount,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5v14" />
        </svg>
      ),
    },
    {
      id: 'free', label: 'GRATUITOS', count: freeCount,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 10h6M9 14h6" />
        </svg>
      ),
    },
  ];

  let filtered = SHOWS.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.venue.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q);

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

  const selectedSortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? SORT_OPTIONS[0].label;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>CATÁLOGO</div>
            <h1 className={styles.title}>{t('title')}</h1>
            <p className={styles.subtitle}>{t('subtitle')}</p>
          </div>

          {!isLoading && (
            <div className={styles.statsRow}>
              <div className={`${styles.statCard} ${styles.statCardLive}`}>
                <div className={styles.statCardGlow} />
                <div className={`${styles.statLabel} ${styles.statLabelLive}`}>
                  <span className={styles.statLiveDot} />
                  AO VIVO AGORA
                </div>
                <div className={styles.statValue}>
                  <span className={styles.statNumber}>{liveCount}</span>
                  <span className={styles.statUnit}>shows</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>CATÁLOGO</div>
                <div className={styles.statValue}>
                  <span className={styles.statNumber}>{SHOWS.length}</span>
                  <span className={styles.statUnit}>no total</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search + Sort */}
        <div className={styles.searchRow}>
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

          <div className={styles.sortBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
            <span className={styles.sortLabel}>{selectedSortLabel}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className={styles.sortSelect}
              aria-label="Ordenar"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
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
                {c.icon}
                {c.label}
                <span className={isActive ? styles.chipBadgeActive : styles.chipBadgeInactive}>
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Count + view toggle */}
        <div className={styles.countRow}>
          <div className={styles.countLabel}>
            <span className={styles.countNum}>{isLoading ? '—' : filtered.length}</span>
            {' SHOWS ENCONTRADOS'}
          </div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === 'grid' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('grid')}
              aria-label="Vista em grade"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>
            <button
              className={`${styles.viewBtn} ${view === 'list' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('list')}
              aria-label="Vista em lista"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
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
            <p className={styles.emptyTitle}>Nenhum show encontrado</p>
            <p className={styles.emptySubtitle}>Tente outra busca ou remova os filtros.</p>
            <button onClick={() => { setSearch(''); setChip('all'); }} className={styles.clearBtn}>
              {t('clearFilters')}
            </button>
          </div>
        )}

        {/* Ad banner — FEED placement */}
        <AdBanner placement="FEED" className={styles.feedAd} />

        {/* Grid */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className={view === 'grid' ? styles.cardGrid : styles.cardList}>
            {filtered.map((show) => (
              <ShowCard key={show.id} show={show} layout={view === 'list' ? 'horizontal' : 'vertical'} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
