'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, CalendarDays, Radio, CheckCircle2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Pagination } from '@live-show/design-system';
import { useMyEventCountsQuery, useMyEventsPageQuery } from '../../queries/use-my-events-page';
import { hrefForMyEvents, parseMyEventsParams } from '../../utils/my-events-params';
import { EventDashboardCard } from './EventDashboardCard';
import type { MyEventCounts, MyEventsStatusFilter } from '../../types/event.types';
import styles from './EventsPageContent.module.scss';

const DEFAULT_PAGE_SIZE = 20;

export function EventsPageContent() {
  const t = useTranslations('eventsPage');
  const tList = useTranslations('events.list');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, page } = parseMyEventsParams(searchParams);

  const { data: counts } = useMyEventCountsQuery();
  const { data, isLoading, isError, isPlaceholderData } = useMyEventsPageQuery(
    status ? { page, status } : { page },
  );

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const events = data?.items ?? [];

  // A stale or hand-typed ?page= past the end lands on the last real page.
  // Placeholder data belongs to the previous tab/page, so it can't decide this.
  useEffect(() => {
    if (!data || isPlaceholderData || page <= pageCount) return;
    router.replace(hrefForMyEvents({ status, page: pageCount }));
  }, [data, isPlaceholderData, page, pageCount, status, router]);

  const tabs: { label: string; status?: MyEventsStatusFilter }[] = [
    { label: t('filterAll') },
    { label: t('filterDraft'), status: 'DRAFT' },
    { label: t('filterPublished'), status: 'PUBLISHED' },
    { label: t('filterLive'), status: 'LIVE' },
    { label: t('filterFinished'), status: 'FINISHED' },
    { label: t('filterCancelled'), status: 'CANCELLED' },
  ];

  const loaded = !isLoading && !isError && !!data;
  const outOfRange = page > pageCount;
  const hrefForPage = (target: number) => hrefForMyEvents({ status, page: target });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>{t('heading')}</h1>
          <p className={styles.subheading}>{t('subheading')}</p>
        </div>
        <Link href="/dashboard/events/new" className={styles.createBtn}>
          <Plus size={16} />
          {t('createBtn')}
        </Link>
      </div>

      <EventStats counts={counts} />

      <nav aria-label={t('filtersNav')} className={styles.filters}>
        {tabs.map((tab) => {
          const active = tab.status === status;
          return (
            <Link
              key={tab.status ?? 'all'}
              href={hrefForMyEvents({ status: tab.status, page: 1 })}
              aria-current={active ? 'page' : undefined}
              className={`${styles.filterBtn} ${active ? styles.filterActive : ''}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {isLoading && <p className={styles.state}>{t('loading')}</p>}
      {isError && <p className={`${styles.state} ${styles.stateError}`}>{t('error')}</p>}

      {loaded && total === 0 && !status && (
        <div className={styles.empty}>
          <CalendarDays size={40} className={styles.emptyIcon} />
          <p>{t('empty')}</p>
          <Link href="/dashboard/events/new" className={styles.createBtn}>
            <Plus size={14} /> {t('createFirst')}
          </Link>
        </div>
      )}

      {loaded && total === 0 && status && (
        <div className={styles.empty}>
          <CalendarDays size={40} className={styles.emptyIcon} />
          <p>{t('emptyFilter')}</p>
          <Link href={hrefForMyEvents({ page: 1 })} className={styles.filterBtn}>
            {t('showAll')}
          </Link>
        </div>
      )}

      {loaded && events.length > 0 && (
        <div className={styles.grid}>
          {events.map((event) => (
            <EventDashboardCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {loaded && total > 0 && !outOfRange && (
        <div className={styles.paginationRow}>
          <span className={styles.paginationRange}>
            {tList('pagination.range', {
              from: (page - 1) * pageSize + 1,
              to: Math.min(page * pageSize, total),
              total,
            })}
          </span>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={(target) => router.push(hrefForPage(target))}
            hrefFor={hrefForPage}
            labels={{
              prev: tList('pagination.prev'),
              next: tList('pagination.next'),
              nav: tList('pagination.nav'),
              prevAria: tList('pagination.prevAria'),
              nextAria: tList('pagination.nextAria'),
            }}
          />
        </div>
      )}
    </div>
  );
}

function EventStats({ counts }: { counts?: MyEventCounts }) {
  const t = useTranslations('eventsPage');
  // No count until the endpoint answers: a placeholder 0 would read as fact.
  const show = (value?: number) => value ?? '–';
  const liveActive = !!counts?.live;

  return (
    <div className={styles.stats}>
      <div className={styles.statCard}>
        <CalendarDays size={20} className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{show(counts?.all)}</p>
          <p className={styles.statLabel}>{t('statTotal')}</p>
        </div>
      </div>
      <div className={`${styles.statCard} ${styles.statCardLive} ${liveActive ? styles.statCardLiveActive : ''}`}>
        <Radio size={20} className={`${styles.statIcon} ${liveActive ? styles.statIconLiveActive : ''}`} />
        <div>
          <p className={styles.statValue}>{show(counts?.live)}</p>
          <p className={styles.statLabel}>{t('statLive')}</p>
        </div>
      </div>
      <div className={styles.statCard}>
        <Clock size={20} className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{show(counts?.upcoming)}</p>
          <p className={styles.statLabel}>{t('statPublished')}</p>
        </div>
      </div>
      <div className={styles.statCard}>
        <CheckCircle2 size={20} className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{show(counts?.finished)}</p>
          <p className={styles.statLabel}>{t('statFinished')}</p>
        </div>
      </div>
    </div>
  );
}
