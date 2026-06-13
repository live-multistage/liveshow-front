'use client';

import { useRouter } from 'next/navigation';
import { Ticket, ShoppingBag } from 'lucide-react';
import { useListEventsQuery, eventToShow, ShowCard } from '@/features/events';
import { TicketList } from './TicketList';
import { useTickets } from '../hooks/use-tickets';
import styles from '../../../app/(user)/tickets/page.module.scss';

export function MyTicketsPageContent() {
  const router = useRouter();
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
            <h1 className={styles.title}>Meus Ingressos</h1>
          </div>
          <p className={styles.subtitle}>Acesse todos os shows que você comprou</p>
        </div>

        {tickets.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <ShoppingBag size={40} />
            </div>
            <h3 className={styles.emptyTitle}>Nenhum ingresso ainda</h3>
            <p className={styles.emptyDesc}>
              Explore a programação e compre seu primeiro ingresso!
            </p>
            <button onClick={() => router.push('/')} className={styles.emptyBtn}>
              Ver Shows
            </button>
          </div>
        ) : (
          <>
            <div className={styles.stats}>
              <span className={styles.statItem}>
                <span className={styles.statDotGreen} />
                <span className={styles.statValue}>{tickets.length}</span>
                ingresso{tickets.length !== 1 ? 's' : ''}
              </span>
              {withReplay.length > 0 && (
                <span className={styles.statItem}>
                  <span className={styles.statDotBlue} />
                  <span className={styles.statValue}>{withReplay.length}</span>
                  com reprise
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
                  <h2 className={styles.recoTitle}>Você também pode gostar</h2>
                  <button onClick={() => router.push('/')} className={styles.recoLink}>
                    Ver todos →
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
