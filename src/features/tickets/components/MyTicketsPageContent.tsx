'use client';

import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
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
          <div>
            <div className={styles.eyebrow}>MINHA BIBLIOTECA</div>
            <h1 className={styles.title}>{t('title')}</h1>
            <p className={styles.subtitle}>{t('subtitle')}</p>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>ATIVOS</div>
              <div className={styles.statValue}>
                <span className={styles.statNumber}>{tickets.length}</span>
                <span className={styles.statUnit}>ingressos</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardReplay}`}>
              <div className={styles.replayGlow} />
              <div className={`${styles.statLabel} ${styles.statLabelReplay}`}>REPLAY</div>
              <div className={styles.statValue}>
                <span className={styles.statNumber}>{withReplay.length}</span>
                <span className={styles.statUnit}>com reprise</span>
              </div>
            </div>
          </div>
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
            <TicketList
              tickets={tickets}
              withReplay={withReplay}
              withoutReplay={withoutReplay}
              withCamera={withCamera}
            />

            {upcomingShows.length > 0 && (
              <div className={styles.recommendations}>
                <div className={styles.recoHeader}>
                  <div>
                    <div className={styles.recoLabel}>{t('recommendations.title')}</div>
                    <p className={styles.recoSub}>{t('recommendations.subtitle')}</p>
                  </div>
                  <button onClick={() => router.push('/')} className={styles.recoLink}>
                    VER TODOS →
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
