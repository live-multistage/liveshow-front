import { formatPrice } from '@/features/events';
import type { TicketProductResponse } from '@/features/events';
import { CAPABILITY_LABELS } from '@/features/cart';
import styles from './TicketSummaryCard.module.scss';

interface Props {
  ticket: TicketProductResponse;
  quantity: number;
  eventName?: string;
}

export function TicketSummaryCard({ ticket, quantity, eventName }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.body}>
        {eventName && (
          <div className={styles.eventLabel}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/>
            </svg>
            {eventName}
          </div>
        )}

        <div className={styles.row}>
          <p className={styles.name}>{ticket.name}</p>
          <p className={styles.price}>{quantity}× {formatPrice(ticket.price)}</p>
        </div>

        {ticket.capabilities.length > 0 && (
          <div className={styles.capabilities}>
            {ticket.capabilities.map((c) => (
              <div key={c} className={styles.capItem}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2.4">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {CAPABILITY_LABELS[c]}
              </div>
            ))}
            {ticket.camerasLimit != null && (
              <div className={styles.capItem}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2.4">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {ticket.camerasLimit} câmeras
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
