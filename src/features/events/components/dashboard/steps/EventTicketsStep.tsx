import { TicketSection, type AddedTicket } from '../TicketSection';
import styles from '../CreateEventForm.module.scss';

interface Props {
  tickets: AddedTicket[];
  onTicketsChange: (tickets: AddedTicket[]) => void;
  ticketsError: string | null;
  mutationError: string | null;
}

export function EventTicketsStep({ tickets, onTicketsChange, ticketsError, mutationError }: Props) {
  return (
    <section className={styles.section}>
      <TicketSection tickets={tickets} onChange={onTicketsChange} />
      {ticketsError && <p className={styles.error}>{ticketsError}</p>}
      {mutationError && (
        <p className={`${styles.error} ${styles.globalError}`}>{mutationError}</p>
      )}
    </section>
  );
}
