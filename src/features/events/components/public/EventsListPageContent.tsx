'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  CustomSelect,
  CustomSelectContent,
  CustomSelectItem,
  CustomSelectTrigger,
  CustomSelectValue,
  Pagination,
} from '@live-show/design-system';
import { TrackFeature } from '@live-show/analytics-sdk/react';
import { useListEventsPageQuery, useEventCountsQuery, eventToShow } from '@/features/events';
import type { PaginatedEventsResponse, EventFacetCounts } from '@/features/events';
import { EVENT_CATEGORY_LABELS } from '../../types/event.types';
import { AdBanner } from '@/features/advertisements';
import { parseListParams, hrefForPage, hrefForChip, chipFromParams } from '../../utils/list-params-from-search';
import type { ChipId } from '../../utils/list-params-from-search';
import { useAnalytics } from '@/lib/analytics/tracking';
import { ShowCard } from './ShowCard';
import styles from '../../../../app/(public)/events/page.module.scss';
import { formatCount } from '@/shared/utils/format-count';

// Debounce for search_performed: fires once the user stops typing, not on
// every keystroke — matches how search analytics is read everywhere else.
const SEARCH_TRACK_DEBOUNCE_MS = 400;

type ViewMode = 'grid' | 'list';

const SORT_OPTIONS = [
  { id: 'date-asc',   label: 'DATA (MAIS PRÓXIMA)' },
  { id: 'date-desc',  label: 'DATA (MAIS DISTANTE)' },
  { id: 'name-asc',   label: 'NOME (A → Z)' },
  { id: 'name-desc',  label: 'NOME (Z → A)' },
  { id: 'live-first', label: 'AO VIVO PRIMEIRO' },
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function EventsListPageContent({
  initialPage,
  initialCounts,
  pageSize,
}: {
  initialPage: PaginatedEventsResponse;
  initialCounts?: EventFacetCounts | null;
  pageSize: number;
}) {
  const t = useTranslations('events.list');
  const tFilter = useTranslations('events.activeFilter');
  const router = useRouter();
  const searchParams = useSearchParams();
  const gridTopRef = useRef<HTMLDivElement>(null);
  const analytics = useAnalytics();

  // The URL is the source of truth: filters/page are re-derived on every
  // render, so browser back/forward (or a hand-edited URL) always renders
  // the right thing.
  const urlParams = parseListParams(searchParams, pageSize);
  // Clamp against the SSR-seeded total — matches page.tsx's own clamp rule.
  // The catalog size rarely changes between page navigations in a session,
  // so this stays accurate without a pre-flight fetch just to learn pageCount.
  const clampPageCount = Math.max(1, Math.ceil(initialPage.total / pageSize));
  const page = Math.min(urlParams.page ?? 1, clampPageCount);
  const params = { ...urlParams, page };

  const { data, isError, refetch } = useListEventsPageQuery(
    params,
    page === initialPage.page ? initialPage : undefined,
  );
  const isLoading = !data && !isError;
  const events = data?.items ?? [];
  const total = data?.total ?? initialPage.total;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // NOTE: chips are server-driven (URL → backend); only the text search and
  // sort below are page-local, applied over this page's items.
  const SHOWS = useMemo(() => events.map(eventToShow), [events]);

  const { category, subtype, tag, city } = params;
  const { data: counts } = useEventCountsQuery({ category, subtype, tag, city }, initialCounts ?? undefined);
  const chip = chipFromParams(params);

  const goToPage = (target: number) => {
    router.push(hrefForPage(searchParams, target), { scroll: false });
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Category/subtype/tag/city come from the URL only — no chip toggles them,
  // so a single value (the first one present) is shown as an active filter.
  const activeFilterLabel = params.category
    ? EVENT_CATEGORY_LABELS[params.category]
    : params.subtype
    ? capitalize(params.subtype)
    : params.tag
    ? capitalize(params.tag)
    : params.city
    ? capitalize(params.city)
    : null;

  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState('date-asc');
  const [view, setView]     = useState<ViewMode>('grid');

  const CHIPS: { id: ChipId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'all', label: 'TODOS',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: 'live', label: 'AO VIVO',
      icon: <span className={styles.chipLiveDot} />,
    },
    {
      id: 'replay', label: 'COM REPRISE',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 1 3 6.7M3 21v-5h5" />
        </svg>
      ),
    },
    {
      id: 'today', label: 'HOJE',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      ),
    },
    {
      id: 'weekend', label: 'FIM DE SEMANA',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5v14" />
        </svg>
      ),
    },
    {
      id: 'free', label: 'GRATUITOS',
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
      s.category.toLowerCase().includes(q);

    return matchSearch;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'date-asc')   return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sort === 'date-desc')  return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sort === 'name-asc')   return a.title.localeCompare(b.title, 'pt-BR');
    if (sort === 'name-desc')  return b.title.localeCompare(a.title, 'pt-BR');
    if (sort === 'live-first') return (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0);
    return 0;
  });

  const resultCount = filtered.length;
  // Read at fire time, not from the closure captured when `search` last
  // changed — a chip/sort change (or fresh data) between the keystroke and
  // the debounce firing must not report a stale count.
  const resultCountRef = useRef(resultCount);
  resultCountRef.current = resultCount;

  // Debounced so typing doesn't spam search_performed — fires once the user
  // pauses, skipped entirely for an empty query (nothing was searched).
  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(() => {
      analytics.track('search_performed', { query: search.trim().slice(0, 100), resultCount: resultCountRef.current });
    }, SEARCH_TRACK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resultCount is read from the ref at fire time; only `search` should restart the debounce
  }, [search]);

  const handleChipChange = (nextChip: ChipId) => {
    analytics.track('events_filtered', { filter: 'chip', value: nextChip, resultCount: counts?.[nextChip] });
    router.push(hrefForChip(searchParams, nextChip), { scroll: false });
  };

  const handleSortChange = (nextSort: string) => {
    setSort(nextSort);
    analytics.track('events_filtered', { filter: 'sort', value: nextSort, resultCount });
  };

  return (
    <TrackFeature name="search">
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
                  <span className={styles.statNumber}>{counts?.live ?? '—'}</span>
                  <span className={styles.statUnit}>eventos</span>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>CATÁLOGO</div>
                <div className={styles.statValue}>
                  <span className={styles.statNumber} title={total.toLocaleString('pt-BR')}>
                    {formatCount(total)}
                  </span>
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

          <div className={styles.sort}>
            <CustomSelect value={sort} onValueChange={handleSortChange}>
              <CustomSelectTrigger
                aria-label="Ordenar"
                leadingIcon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 6h18M6 12h12M10 18h4" />
                  </svg>
                }
              >
                <CustomSelectValue />
              </CustomSelectTrigger>
              <CustomSelectContent align="end">
                {SORT_OPTIONS.map((opt) => (
                  <CustomSelectItem key={opt.id} value={opt.id}>{opt.label}</CustomSelectItem>
                ))}
              </CustomSelectContent>
            </CustomSelect>
          </div>
        </div>

        {/* Category chips */}
        <div className={styles.chips}>
          {CHIPS.map((c) => {
            const isActive = chip === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleChipChange(c.id)}
                className={`${styles.chip} ${isActive ? styles.chipActive : styles.chipInactive}`}
              >
                {c.icon}
                {c.label}
                <span className={isActive ? styles.chipBadgeActive : styles.chipBadgeInactive}>
                  {counts?.[c.id] ?? '—'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active URL filter (category/subtype/tag/city) — chips above don't
            toggle these, so surface whichever one is set with a way to clear. */}
        {activeFilterLabel && (
          <div className={styles.activeFilterRow}>
            <span className={`${styles.chip} ${styles.chipActive}`}>{activeFilterLabel}</span>
            <Link href="/events" className={styles.activeFilterClear}>
              × {tFilter('clear')}
            </Link>
          </div>
        )}

        <div ref={gridTopRef} />

        {/* Count + view toggle */}
        <div className={styles.countRow}>
          <h2 className={styles.countLabel}>
            <span className={styles.countNum}>{isLoading ? '—' : search.trim() ? filtered.length : total}</span>
            {' EVENTOS ENCONTRADOS'}
          </h2>
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
            <button onClick={() => refetch()} className={styles.clearBtn}>
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nenhum evento encontrado</p>
            <p className={styles.emptySubtitle}>Tente outra busca ou remova os filtros.</p>
            <button onClick={() => { setSearch(''); router.push(hrefForChip(searchParams, 'all'), { scroll: false }); }} className={styles.clearBtn}>
              {t('clearFilters')}
            </button>
          </div>
        )}

        {/* Ad banner — FEED placement */}
        <AdBanner placement="FEED" className={styles.feedAd} />

        {/* Grid */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className={view === 'grid' ? styles.cardGrid : styles.cardList}>
            {filtered.map((show, index) => (
              <ShowCard
                key={show.id}
                show={show}
                layout={view === 'list' ? 'horizontal' : 'vertical'}
                size={view === 'grid' ? 'compact' : 'default'}
                list="events_list"
                position={(page - 1) * pageSize + index}
                priority={index < 2}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && total > 0 && (
          <div className={styles.paginationRow}>
            <span className={styles.paginationRange}>
              {t('pagination.range', {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, total),
                total,
              })}
            </span>
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={goToPage}
              hrefFor={(n) => hrefForPage(searchParams, n)}
              labels={{
                prev: t('pagination.prev'),
                next: t('pagination.next'),
                nav: t('pagination.nav'),
                prevAria: t('pagination.prevAria'),
                nextAria: t('pagination.nextAria'),
              }}
            />
          </div>
        )}

      </div>
    </div>
    </TrackFeature>
  );
}
