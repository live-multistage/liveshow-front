'use client';

import Link from 'next/link';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { EventDashboardCard } from '@/features/events';
import { useDashboardStats } from '../hooks/use-dashboard-stats';
import { DashboardCharts } from './DashboardCharts';
import styles from './RoleDashboard.module.scss';

export function AdminDashboard() {
  const { totalEvents, liveNow, upcoming, drafts, finished, events, recentEvents, isLoading } =
    useDashboardStats();

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.heading}>Admin Overview</h1>

      <div className={styles.grid}>
        <div className={styles.card}>
          {isLoading ? (
            <Skeleton className={styles.valueSkeleton} />
          ) : (
            <p className={styles.cardValue}>{totalEvents}</p>
          )}
          <p className={styles.cardLabel}>Total Events</p>
          <p className={styles.cardHint}>All platform events</p>
        </div>

        <div className={styles.card}>
          {isLoading ? (
            <Skeleton className={styles.valueSkeleton} />
          ) : (
            <p className={`${styles.cardValue} ${liveNow > 0 ? styles.cardValueLive : ''}`}>
              {liveNow}
            </p>
          )}
          <p className={styles.cardLabel}>Live Now</p>
          <p className={styles.cardHint}>Active streams</p>
        </div>

        <div className={styles.card}>
          {isLoading ? (
            <Skeleton className={styles.valueSkeleton} />
          ) : (
            <p className={styles.cardValue}>{upcoming}</p>
          )}
          <p className={styles.cardLabel}>Upcoming</p>
          <p className={styles.cardHint}>Published & scheduled</p>
        </div>

        <div className={styles.card}>
          {isLoading ? (
            <Skeleton className={styles.valueSkeleton} />
          ) : (
            <p className={styles.cardValue}>{drafts}</p>
          )}
          <p className={styles.cardLabel}>Drafts</p>
          <p className={styles.cardHint}>Awaiting publication</p>
        </div>

        <div className={styles.card}>
          {isLoading ? (
            <Skeleton className={styles.valueSkeleton} />
          ) : (
            <p className={styles.cardValue}>{finished}</p>
          )}
          <p className={styles.cardLabel}>Finished</p>
          <p className={styles.cardHint}>Completed events</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardValue}>—</p>
          <p className={styles.cardLabel}>Revenue</p>
          <p className={styles.cardHint}>Coming soon</p>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Estatísticas</h2>
        </div>
        <DashboardCharts events={events} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Eventos Recentes</h2>
          <Link href="/dashboard/events" className={styles.viewAll}>
            Ver todos →
          </Link>
        </div>

        {isLoading && (
          <div className={styles.eventsSkeletonList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={styles.eventSkeleton} />
            ))}
          </div>
        )}

        {!isLoading && recentEvents.length === 0 && (
          <p className={styles.eventsEmpty}>Nenhum evento criado ainda.</p>
        )}

        {!isLoading && recentEvents.length > 0 && (
          <div className={styles.eventsGrid}>
            {recentEvents.map((event) => (
              <EventDashboardCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
