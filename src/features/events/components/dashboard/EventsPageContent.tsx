'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CalendarDays, Radio, CheckCircle2, Clock } from 'lucide-react';
import { useMyEventsQuery } from '../../queries/get-my-events';
import { EventDashboardCard } from './EventDashboardCard';
import type { EventStatus } from '../../types/event.types';
import styles from './EventsPageContent.module.scss';

const FILTERS: { label: string; value: EventStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Rascunho', value: 'DRAFT' },
  { label: 'Publicados', value: 'PUBLISHED' },
  { label: 'Ao Vivo', value: 'LIVE' },
  { label: 'Encerrados', value: 'FINISHED' },
  { label: 'Cancelados', value: 'CANCELLED' },
];

export function EventsPageContent() {
  const [activeFilter, setActiveFilter] = useState<EventStatus | 'all'>('all');
  const router = useRouter();
  const { data: events = [], isLoading, isError } = useMyEventsQuery();

  const total = events.length;
  const live = events.filter((e) => e.status === 'LIVE').length;
  const upcoming = events.filter((e) => e.status === 'PUBLISHED').length;
  const finished = events.filter((e) => e.status === 'FINISHED').length;

  const filtered = activeFilter === 'all'
    ? events
    : events.filter((e) => e.status === activeFilter);


  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Eventos</h1>
          <p className={styles.subheading}>Gerencie seus eventos e transmissões</p>
        </div>
        <button className={styles.createBtn} onClick={() => router.push('/dashboard/events/new')}>
          <Plus size={16} />
          Criar Evento
        </button>
      </div>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <CalendarDays size={20} className={styles.statIcon} />
          <div>
            <p className={styles.statValue}>{total}</p>
            <p className={styles.statLabel}>Total</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardLive} ${!!live && styles.statCardLiveActive}`}>
          <Radio size={20} className={`${styles.statIcon} ${!!live && styles.statIconLiveActive}`} />
          <div>
            <p className={styles.statValue}>{live}</p>
            <p className={styles.statLabel}>Ao Vivo</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <Clock size={20} className={styles.statIcon} />
          <div>
            <p className={styles.statValue}>{upcoming}</p>
            <p className={styles.statLabel}>Publicados</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <CheckCircle2 size={20} className={styles.statIcon} />
          <div>
            <p className={styles.statValue}>{finished}</p>
            <p className={styles.statLabel}>Encerrados</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`${styles.filterBtn} ${activeFilter === f.value ? styles.filterActive : ''}`}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      {isLoading && <p className={styles.state}>Carregando eventos...</p>}
      {isError && <p className={`${styles.state} ${styles.stateError}`}>Erro ao carregar eventos.</p>}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className={styles.empty}>
          <CalendarDays size={40} className={styles.emptyIcon} />
          <p>Nenhum evento encontrado.</p>
          <button className={styles.createBtn} onClick={() => router.push('/dashboard/events/new')}>
            <Plus size={14} /> Criar primeiro evento
          </button>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((event) => (
            <EventDashboardCard key={event.id} event={event} />
          ))}
        </div>
      )}

    </div>
  );
}
