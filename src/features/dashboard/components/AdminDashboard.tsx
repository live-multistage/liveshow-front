'use client';

import Link from 'next/link';
import { useNavigate } from '@/shared/hooks/use-navigate';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { EventDashboardCard } from '@/features/events';
import { useDashboardStats } from '../hooks/use-dashboard-stats';
import { DashboardCharts } from './DashboardCharts';
import styles from './RoleDashboard.module.scss';
import { Button } from '@/shared/components/Button';
import { PlusIcon } from 'lucide-react';

export function AdminDashboard() {
  const t = useTranslations('dashboard.overview');
  const navigate = useNavigate();
  const { totalEvents, liveNow, upcoming, drafts, finished, events, recentEvents, isLoading } =
    useDashboardStats();

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titles}>
          <span className={styles.upperSubTitle}>VISÃO GERAL</span>
          <h1 className={styles.heading}>{t('admin.heading')}</h1>
        </div>
        <div>
          <Button
            variant="primary"
            icon={<PlusIcon />}
            onClick={() => navigate.push('/dashboard/events/new')}
          >
            Novo evento
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          {isLoading ? <Skeleton className={styles.valueSkeleton} /> : <p className={styles.cardValue}>{totalEvents}</p>}
          <p className={styles.cardLabel}>{t('total')}</p>
          <p className={styles.cardHint}>{t('admin.totalHint')}</p>
        </div>

        <div className={styles.card}>
          {isLoading ? <Skeleton className={styles.valueSkeleton} /> : (
            <p className={`${styles.cardValue} ${liveNow > 0 ? styles.cardValueLive : ''}`}>{liveNow}</p>
          )}
          <p className={styles.cardLabel}>{t('liveNow')}</p>
          <p className={styles.cardHint}>{t('admin.liveHint')}</p>
        </div>

        <div className={styles.card}>
          {isLoading ? <Skeleton className={styles.valueSkeleton} /> : <p className={styles.cardValue}>{upcoming}</p>}
          <p className={styles.cardLabel}>{t('upcoming')}</p>
          <p className={styles.cardHint}>{t('admin.upcomingHint')}</p>
        </div>

        <div className={styles.card}>
          {isLoading ? <Skeleton className={styles.valueSkeleton} /> : <p className={styles.cardValue}>{drafts}</p>}
          <p className={styles.cardLabel}>{t('drafts')}</p>
          <p className={styles.cardHint}>{t('admin.draftsHint')}</p>
        </div>

        <div className={styles.card}>
          {isLoading ? <Skeleton className={styles.valueSkeleton} /> : <p className={styles.cardValue}>{finished}</p>}
          <p className={styles.cardLabel}>{t('finished')}</p>
          <p className={styles.cardHint}>{t('admin.finishedHint')}</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardValue}>—</p>
          <p className={styles.cardLabel}>{t('revenue')}</p>
          <p className={styles.cardHint}>{t('admin.revenueHint')}</p>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('stats')}</h2>
        </div>
        <DashboardCharts events={events} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('recentEvents')}</h2>
          <Link href="/dashboard/events" className={styles.viewAll}>{t('viewAll')}</Link>
        </div>

        {isLoading && (
          <div className={styles.eventsSkeletonList}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className={styles.eventSkeleton} />)}
          </div>
        )}
        {!isLoading && recentEvents.length === 0 && <p className={styles.eventsEmpty}>{t('emptyEvents')}</p>}
        {!isLoading && recentEvents.length > 0 && (
          <div className={styles.eventsGrid}>
            {recentEvents.map((event) => <EventDashboardCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </div>
  );
}
