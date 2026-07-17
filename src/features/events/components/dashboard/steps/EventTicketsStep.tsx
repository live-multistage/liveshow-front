import { TicketSection, type AddedTicket } from '../TicketSection';
import type { EventFormat } from '../../../types/event.types';
import styles from '../CreateEventForm.module.scss';

interface Props {
  tickets: AddedTicket[];
  onTicketsChange: (tickets: AddedTicket[]) => void;
  ticketsError: string | null;
  mutationError: string | null;
  format?: EventFormat;
}

export function EventTicketsStep({ tickets, onTicketsChange, ticketsError, mutationError, format }: Props) {
  return (
    <section className={styles.section}>
      <TicketSection tickets={tickets} onChange={onTicketsChange} format={format} />
      {ticketsError && <p className={styles.error}>{ticketsError}</p>}
      {mutationError && (
        <p className={`${styles.error} ${styles.globalError}`}>{mutationError}</p>
      )}
    </section>
  );
}
