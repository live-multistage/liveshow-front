'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useListEventsQuery, eventToShow } from '@/features/events';
import { ShowCard } from './ShowCard';
import styles from '../../../../app/(public)/events/page.module.scss';

const SORT_OPTIONS = [
  { id: 'date-asc', label: 'Data (mais próxima)' },
  { id: 'date-desc', label: 'Data (mais distante)' },
  { id: 'name-asc', label: 'Nome (A → Z)' },
  { id: 'name-desc', label: 'Nome (Z → A)' },
  { id: 'live-first', label: 'Ao vivo primeiro' },
];

export function EventsListPageContent() {
  const t = useTranslations('events.list');

  const { data: events = [], isLoading, isError } = useListEventsQuery('all');
  const SHOWS = useMemo(() => events.map(eventToShow), [events]);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date-asc');
  const [liveOnly, setLiveOnly] = useState(false);
  const [replayOnly, setReplayOnly] = useState(false);

  let filtered = SHOWS.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.title.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.venue.toLowerCase().includes(q);
    const matchLive = !liveOnly || s.isLive;
    const matchReplay = !replayOnly || s.hasReplay;
    return matchSearch && matchLive && matchReplay;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'date-asc')  return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sort === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sort === 'name-asc')  return a.title.localeCompare(b.title, 'pt-BR');
    if (sort === 'name-desc') return b.title.localeCompare(a.title, 'pt-BR');
    if (sort === 'live-first') return (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0);
    return 0;
  });

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.headerRow}>
            <Calendar size={22} />
            <h1 className={styles.headerTitle}>{t('title')}</h1>
          </div>
          <p className={styles.headerSubtitle}>{t('subtitle')}</p>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterRow}>
            <div className={styles.sortBox}>
              <SlidersHorizontal size={16} />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={styles.sortSelect}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.toggleRow}>
            <button
              onClick={() => setLiveOnly(!liveOnly)}
              className={`${styles.filterBtn} ${liveOnly ? styles.filterBtnLiveActive : styles.filterBtnDefault}`}
            >
              <span className={`${styles.dot} ${liveOnly ? styles.dotActive : styles.dotDefault}`} />
              {t('liveOnly')}
            </button>
            <button
              onClick={() => setReplayOnly(!replayOnly)}
              className={`${styles.filterBtn} ${replayOnly ? styles.filterBtnReplayActive : styles.filterBtnDefault}`}
            >
              ↩ {t('withReplay')}
            </button>
          </div>
        </div>

        <p className={styles.count}>
          {isLoading ? t('loading') : t('count', { count: filtered.length })}
        </p>

        {isError && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>{t('error')}</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>{t('noResults')}</p>
            <button
              onClick={() => { setSearch(''); setSort('date-asc'); setLiveOnly(false); setReplayOnly(false); }}
              className={styles.clearBtn}
            >
              {t('clearFilters')}
            </button>
          </div>
        ) : (
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
