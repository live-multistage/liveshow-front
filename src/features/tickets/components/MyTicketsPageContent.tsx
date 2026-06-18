'use client';

import { useRouter } from 'next/navigation';
import { Ticket, ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useListEventsQuery, eventToShow, ShowCard } from '@/features/events';
import { TicketList } from './TicketList';
import { useTickets } from '../hooks/use-tickets';
import styles from '../../../app/(user)/tickets/page.module.scss';

export function MyTicketsPageContent() {
  const router = useRouter();
  const t = useTranslations('tickets');
  const { tickets, withReplay, withoutReplay, withCamera, isLoading } = useTickets();
  const { data: events = [] } = useListEventsQuery('all');

  const ticketIds = tickets.map((t) => t.event.id);
  const upcomingShows = events
    .map(eventToShow)
    .filter((s) => !ticketIds.includes(s.id))
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.headerRow}>
            <Ticket size={22} />
            <h1 className={styles.title}>{t('title')}</h1>
          </div>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        {tickets.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ShoppingBag size={40} />
            </div>
            <h3 className={styles.emptyTitle}>{t('empty.title')}</h3>
            <p className={styles.emptyDesc}>{t('empty.desc')}</p>
            <button onClick={() => router.push('/')} className={styles.emptyBtn}>
              {t('empty.cta')}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.stats}>
              <span className={styles.statItem}>
                <span className={styles.statDotGreen} />
                <span className={styles.statValue}>{t('stats.count', { count: tickets.length })}</span>
              </span>
              {withReplay.length > 0 && (
                <span className={styles.statItem}>
                  <span className={styles.statDotBlue} />
                  <span className={styles.statValue}>{t('stats.withReplay', { count: withReplay.length })}</span>
                </span>
              )}
            </div>

            <TicketList
              tickets={tickets}
              withReplay={withReplay}
              withoutReplay={withoutReplay}
              withCamera={withCamera}
            />

            {upcomingShows.length > 0 && (
              <div className={styles.recommendations}>
                <div className={styles.recoHeader}>
                  <h2 className={styles.recoTitle}>{t('recommendations.title')}</h2>
                  <button onClick={() => router.push('/')} className={styles.recoLink}>
                    {t('recommendations.seeAll')}
                  </button>
                </div>
                <div className={styles.recoGrid}>
                  {upcomingShows.map((show) => (
                    <ShowCard key={show.id} show={show} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
