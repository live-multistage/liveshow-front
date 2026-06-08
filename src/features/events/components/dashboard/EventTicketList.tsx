'use client';

import { formatPrice } from '../../utils/event-formatters';
import type { TicketProductResponse } from '../../types/event.types';
import styles from './EventDashboardDetailContent.module.scss';

interface Props {
  tickets: TicketProductResponse[];
}

export function EventTicketList({ tickets }: Props) {
  if (tickets.length === 0) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Ingressos</h2>
      <div className={styles.ticketList}>
        {tickets.map((t) => (
          <div key={t.id} className={styles.ticketRow}>
            <div>
              <p className={styles.ticketName}>{t.name}</p>
              <p className={styles.ticketDesc}>{t.description}</p>
            </div>
            <p className={styles.ticketPrice}>{formatPrice(t.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
