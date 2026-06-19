import { Check, Ticket } from 'lucide-react';
import { formatPrice } from '@/features/events';
import type { TicketProductResponse } from '@/features/events';
import { CAPABILITY_LABELS } from '@/features/cart';
import styles from './TicketSummaryCard.module.scss';

interface Props {
  ticket: TicketProductResponse;
  quantity: number;
}

export function TicketSummaryCard({ ticket, quantity }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Ticket size={16} className={styles.icon} />
        <p className={styles.label}>Ingresso selecionado</p>
      </div>

      <div className={styles.row}>
        <div>
          <p className={styles.name}>{ticket.name}</p>
          {ticket.description && (
            <p className={styles.desc}>{ticket.description}</p>
          )}
        </div>
        <div className={styles.pricing}>
          <span className={styles.qty}>{quantity}×</span>
          <span className={styles.price}>{formatPrice(ticket.price)}</span>
        </div>
      </div>

      {ticket.capabilities.length > 0 && (
        <div className={styles.capabilities}>
          <p className={styles.capLabel}>Incluído:</p>
          <ul className={styles.capList}>
            {ticket.capabilities.map((c) => (
              <li key={c} className={styles.capItem}>
                <Check size={12} className={styles.check} />
                {CAPABILITY_LABELS[c]}
              </li>
            ))}
            {ticket.camerasLimit != null && (
              <li className={styles.capItem}>
                <Check size={12} className={styles.check} />
                {ticket.camerasLimit} câmeras
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
