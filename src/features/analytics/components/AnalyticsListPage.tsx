'use client';

import Link from 'next/link';
import { BarChart2, Radio, Clock, CheckCircle2, CalendarDays } from 'lucide-react';
import { useMyEventsQuery } from '@/features/events/queries/get-my-events';
import type { EventResponse, EventStatus } from '@/features/events/types/event.types';
import styles from './AnalyticsListPage.module.scss';

const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT:     'Rascunho',
  PUBLISHED: 'Publicado',
  SCHEDULED: 'Agendado',
  LIVE:      'Ao vivo',
  FINISHED:  'Encerrado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLOR: Record<EventStatus, string> = {
  DRAFT:     '#7d7d85',
  PUBLISHED: '#bba6ff',
  SCHEDULED: '#46d6d8',
  LIVE:      '#ff2e9e',
  FINISHED:  '#7fe0a0',
  CANCELLED: '#ef6b6b',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function EventRow({ event }: { event: EventResponse }) {
  const color = STATUS_COLOR[event.status];
  return (
    <Link href={`/dashboard/analytics/${event.id}`} className={styles.row}>
      <div className={styles.rowLeft}>
        <div className={styles.rowIcon} style={{ background: `${color}1a` }}>
          <BarChart2 size={16} style={{ color }} />
        </div>
        <div>
          <div className={styles.rowTitle}>{event.title}</div>
          <div className={styles.rowMeta}>
            {formatDate(event.startsAt)} → {formatDate(event.endsAt)}
          </div>
        </div>
      </div>
      <div className={styles.rowRight}>
        <span className={styles.rowStatus} style={{ color, background: `${color}1a`, borderColor: `${color}40` }}>
          {event.status === 'LIVE' && <span className={styles.liveDot} />}
          {STATUS_LABEL[event.status]}
        </span>
        <span className={styles.rowCta}>Ver métricas →</span>
      </div>
    </Link>
  );
}

export function AnalyticsListPage() {
  const { data: events = [], isLoading, isError } = useMyEventsQuery();

  const live      = events.filter((e) => e.status === 'LIVE').length;
  const upcoming  = events.filter((e) => e.status === 'PUBLISHED' || e.status === 'SCHEDULED').length;
  const finished  = events.filter((e) => e.status === 'FINISHED').length;

  const ordered = [...events].sort((a, b) => {
    const priority: Record<EventStatus, number> = {
      LIVE: 0, PUBLISHED: 1, SCHEDULED: 2, FINISHED: 3, DRAFT: 4, CANCELLED: 5,
    };
    return priority[a.status] - priority[b.status];
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Análises</h1>
          <p className={styles.sub}>Selecione um evento para ver suas métricas detalhadas</p>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={`${styles.statCard} ${live > 0 ? styles.statLive : ''}`}>
          <Radio size={18} />
          <div>
            <span className={styles.statVal}>{live}</span>
            <span className={styles.statLabel}>Ao vivo</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <Clock size={18} />
          <div>
            <span className={styles.statVal}>{upcoming}</span>
            <span className={styles.statLabel}>Programados</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CheckCircle2 size={18} />
          <div>
            <span className={styles.statVal}>{finished}</span>
            <span className={styles.statLabel}>Encerrados</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CalendarDays size={18} />
          <div>
            <span className={styles.statVal}>{events.length}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {isLoading && (
          <div className={styles.state}>Carregando eventos…</div>
        )}
        {isError && (
          <div className={`${styles.state} ${styles.stateError}`}>Erro ao carregar eventos</div>
        )}
        {!isLoading && !isError && ordered.length === 0 && (
          <div className={styles.state}>Nenhum evento encontrado</div>
        )}
        {ordered.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
