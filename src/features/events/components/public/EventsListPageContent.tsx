'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Calendar } from 'lucide-react';
import { useListEventsQuery, eventToShow } from '@/features/events';
import { ShowCard } from './ShowCard';
import styles from '../../../../app/(public)/events/page.module.scss';

const GENRES = ['Todos', 'Rock', 'Clássico', 'Eletrônica', 'Jazz', 'Ballet', 'Ópera'];
const SORT_OPTIONS = [
  { id: 'date', label: 'Data' },
  { id: 'price-asc', label: 'Menor Preço' },
  { id: 'price-desc', label: 'Maior Preço' },
  { id: 'rating', label: 'Avaliação' },
];

export function EventsListPageContent() {
  const { data: events = [], isLoading, isError } = useListEventsQuery('all');
  const SHOWS = useMemo(() => events.map(eventToShow), [events]);

  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('Todos');
  const [sort, setSort] = useState('date');
  const [liveOnly, setLiveOnly] = useState(false);
  const [replayOnly, setReplayOnly] = useState(false);

  let filtered = SHOWS.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase());
    const matchGenre = genre === 'Todos' || s.genre === genre;
    const matchLive = !liveOnly || s.isLive;
    const matchReplay = !replayOnly || s.hasReplay;
    return matchSearch && matchGenre && matchLive && matchReplay;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'date') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.headerRow}>
            <Calendar size={22} />
            <h1 className={styles.headerTitle}>Programação</h1>
          </div>
          <p className={styles.headerSubtitle}>Shows ao vivo de todo o mundo, na palma da sua mão</p>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por show, artista ou cidade..."
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterRow}>
            <div className={styles.genreScroll}>
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`${styles.genreChip} ${genre === g ? styles.genreActive : styles.genreInactive}`}
                >
                  {g}
                </button>
              ))}
            </div>

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
              Somente Ao Vivo
            </button>
            <button
              onClick={() => setReplayOnly(!replayOnly)}
              className={`${styles.filterBtn} ${replayOnly ? styles.filterBtnReplayActive : styles.filterBtnDefault}`}
            >
              ↩ Com Reprise
            </button>
          </div>
        </div>

        <p className={styles.count}>
          {isLoading ? 'Carregando...' : `${filtered.length} show${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
        </p>

        {isError && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>Erro ao carregar eventos.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>Nenhum show encontrado</p>
            <button
              onClick={() => { setSearch(''); setGenre('Todos'); setLiveOnly(false); setReplayOnly(false); }}
              className={styles.clearBtn}
            >
              Limpar filtros
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
