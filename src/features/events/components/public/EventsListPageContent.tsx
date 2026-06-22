'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useListEventsQuery, eventToShow } from '@/features/events';
import { ShowCard } from './ShowCard';
import { Chip } from '@/shared/components/ui/chip';
import styles from '../../../../app/(public)/events/page.module.scss';

const SORT_OPTIONS = [
  { id: 'date-asc',   label: 'Data (mais próxima)' },
  { id: 'date-desc',  label: 'Data (mais distante)' },
  { id: 'name-asc',   label: 'Nome (A → Z)' },
  { id: 'name-desc',  label: 'Nome (Z → A)' },
  { id: 'live-first', label: 'Ao vivo primeiro' },
];

export function EventsListPageContent() {
  const t = useTranslations('events.list');

  const { data: events = [], isLoading, isError } = useListEventsQuery('all');
  const SHOWS = useMemo(() => events.map(eventToShow), [events]);

  const [search, setSearch]       = useState('');
  const [sort, setSort]           = useState('date-asc');
  const [liveOnly, setLiveOnly]   = useState(false);
  const [replayOnly, setReplayOnly] = useState(false);
  const [genre, setGenre]         = useState('Todos');

  const genres = useMemo(
    () => ['Todos', ...Array.from(new Set(SHOWS.map((s) => s.genre))).sort()],
    [SHOWS],
  );

  const liveCount = useMemo(() => SHOWS.filter((s) => s.isLive).length, [SHOWS]);

  let filtered = SHOWS.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.title.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)  ||
      s.venue.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q);
    const matchLive   = !liveOnly   || s.isLive;
    const matchReplay = !replayOnly || s.hasReplay;
    const matchGenre  = genre === 'Todos' || s.genre === genre;
    return matchSearch && matchLive && matchReplay && matchGenre;
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

  function clearAll() {
    setSearch('');
    setSort('date-asc');
    setLiveOnly(false);
    setReplayOnly(false);
    setGenre('Todos');
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerTitleRow}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff2e9e" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
              </svg>
              <h1 className={styles.headerTitle}>{t('title')}</h1>
            </div>
            <p className={styles.headerSubtitle}>{t('subtitle')}</p>
          </div>

          {!isLoading && (
            <div className={styles.headerStats}>
              <div className={styles.statItem}>
                <div className={styles.statNumber} style={{ color: '#ff2e9e' }}>{liveCount}</div>
                <div className={styles.statLabel}>AO VIVO AGORA</div>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{SHOWS.length}</div>
                <div className={styles.statLabel}>SHOWS NO TOTAL</div>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className={`${styles.searchBox} ${search ? styles.searchBoxFocused : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7d7d85" strokeWidth="2" aria-hidden="true">
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

        {/* Toolbar: sort + toggles */}
        <div className={styles.toolbar}>
          <div className={styles.sortPill}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9aa2" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <span className={styles.sortLabel}>{selectedSortLabel}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7d7d85" strokeWidth="2" aria-hidden="true">
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

          <div className={styles.toolbarDivider} />

          <button
            onClick={() => setLiveOnly(!liveOnly)}
            className={`${styles.toggleBtn} ${liveOnly ? styles.toggleBtnActive : ''}`}
          >
            <span className={`${styles.liveDot} ${liveOnly ? styles.liveDotActive : ''}`} />
            Somente Ao Vivo
          </button>

          <button
            onClick={() => setReplayOnly(!replayOnly)}
            className={`${styles.toggleBtn} ${replayOnly ? styles.toggleBtnActive : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 12a9 9 0 1 1 3 6.7M3 21v-5h5" />
            </svg>
            Com Reprise
          </button>
        </div>

        {/* Genre chips */}
        <div className={styles.genreRow}>
          {genres.map((g) => (
            <Chip
              key={g}
              variant={g === genre ? 'active' : 'default'}
              onClick={() => setGenre(g)}
            >
              {g}
            </Chip>
          ))}
        </div>

        {/* Count */}
        <p className={styles.count}>
          {isLoading
            ? t('loading')
            : <><strong>{filtered.length}</strong> {t('count', { count: filtered.length }).replace(String(filtered.length), '').trim()}</>
          }
        </p>

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
            <button onClick={clearAll} className={styles.clearBtn}>{t('clearFilters')}</button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className={styles.cardGrid}>
            {filtered.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
