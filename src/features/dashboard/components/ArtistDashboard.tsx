'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { EventDashboardCard } from '@/features/events';
import { useDashboardStats } from '../hooks/use-dashboard-stats';
import { DashboardCharts } from './DashboardCharts';
import styles from './RoleDashboard.module.scss';

export function ArtistDashboard() {
  const t = useTranslations('dashboard.overview');
  const { totalEvents, liveNow, upcoming, finished, events, recentEvents, isLoading } =
    useDashboardStats();

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.heading}>{t('artist.heading')}</h1>

      <div className={styles.grid}>
        <div className={styles.card}>
          {isLoading ? <Skeleton className={styles.valueSkeleton} /> : <p className={styles.cardValue}>{totalEvents}</p>}
          <p className={styles.cardLabel}>{t('artist.totalLabel')}</p>
          <p className={styles.cardHint}>{t('artist.totalHint')}</p>
        </div>

        <div className={styles.card}>
          {isLoading ? <Skeleton className={styles.valueSkeleton} /> : (
            <p className={`${styles.cardValue} ${liveNow > 0 ? styles.cardValueLive : ''}`}>{liveNow}</p>
          )}
          <p className={styles.cardLabel}>{t('liveNow')}</p>
          <p className={styles.cardHint}>{t('artist.liveHint')}</p>
        </div>

        <div className={styles.card}>
          {isLoading ? <Skeleton className={styles.valueSkeleton} /> : <p className={styles.cardValue}>{upcoming}</p>}
          <p className={styles.cardLabel}>{t('upcoming')}</p>
          <p className={styles.cardHint}>{t('artist.upcomingHint')}</p>
        </div>

        <div className={styles.card}>
          {isLoading ? <Skeleton className={styles.valueSkeleton} /> : <p className={styles.cardValue}>{finished}</p>}
          <p className={styles.cardLabel}>{t('finished')}</p>
          <p className={styles.cardHint}>{t('artist.finishedHint')}</p>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('stats')}</h2>
        </div>
        <DashboardCharts events={events} eventsOnly />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('recentStreams')}</h2>
          <Link href="/dashboard/events" className={styles.viewAll}>{t('viewAll')}</Link>
        </div>

        {isLoading && (
          <div className={styles.eventsSkeletonList}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className={styles.eventSkeleton} />)}
          </div>
        )}
        {!isLoading && recentEvents.length === 0 && <p className={styles.eventsEmpty}>{t('emptyStreams')}</p>}
        {!isLoading && recentEvents.length > 0 && (
          <div className={styles.eventsGrid}>
            {recentEvents.map((event) => <EventDashboardCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </div>
  );
}
