'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CalendarDays, Radio, CheckCircle2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMyEventsQuery } from '../../queries/get-my-events';
import { EventDashboardCard } from './EventDashboardCard';
import type { EventStatus } from '../../types/event.types';
import styles from './EventsPageContent.module.scss';

export function EventsPageContent() {
  const t = useTranslations('eventsPage');
  const [activeFilter, setActiveFilter] = useState<EventStatus | 'all'>('all');
  const router = useRouter();
  const { data: events = [], isLoading, isError } = useMyEventsQuery();

  const total = events.length;
  const live = events.filter((e) => e.status === 'LIVE').length;
  const upcoming = events.filter((e) => e.status === 'PUBLISHED' || e.status === 'SCHEDULED').length;
  const finished = events.filter((e) => e.status === 'FINISHED').length;

  const filtered = activeFilter === 'all'
    ? events
    : events.filter((e) => e.status === activeFilter);

  const FILTERS: { label: string; value: EventStatus | 'all' }[] = [
    { label: t('filterAll'), value: 'all' },
    { label: t('filterDraft'), value: 'DRAFT' },
    { label: t('filterPublished'), value: 'PUBLISHED' },
    { label: t('filterLive'), value: 'LIVE' },
    { label: t('filterFinished'), value: 'FINISHED' },
    { label: t('filterCancelled'), value: 'CANCELLED' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>{t('heading')}</h1>
          <p className={styles.subheading}>{t('subheading')}</p>
        </div>
        <button className={styles.createBtn} onClick={() => router.push('/dashboard/events/new')}>
          <Plus size={16} />
          {t('createBtn')}
        </button>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <CalendarDays size={20} className={styles.statIcon} />
          <div>
            <p className={styles.statValue}>{total}</p>
            <p className={styles.statLabel}>{t('statTotal')}</p>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardLive} ${!!live && styles.statCardLiveActive}`}>
          <Radio size={20} className={`${styles.statIcon} ${!!live && styles.statIconLiveActive}`} />
          <div>
            <p className={styles.statValue}>{live}</p>
            <p className={styles.statLabel}>{t('statLive')}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <Clock size={20} className={styles.statIcon} />
          <div>
            <p className={styles.statValue}>{upcoming}</p>
            <p className={styles.statLabel}>{t('statPublished')}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <CheckCircle2 size={20} className={styles.statIcon} />
          <div>
            <p className={styles.statValue}>{finished}</p>
            <p className={styles.statLabel}>{t('statFinished')}</p>
          </div>
        </div>
      </div>

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

      {isLoading && <p className={styles.state}>{t('loading')}</p>}
      {isError && <p className={`${styles.state} ${styles.stateError}`}>{t('error')}</p>}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className={styles.empty}>
          <CalendarDays size={40} className={styles.emptyIcon} />
          <p>{t('empty')}</p>
          <button className={styles.createBtn} onClick={() => router.push('/dashboard/events/new')}>
            <Plus size={14} /> {t('createFirst')}
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
