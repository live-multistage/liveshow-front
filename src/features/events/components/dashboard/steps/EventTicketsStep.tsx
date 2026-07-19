import { TicketSection, type AddedTicket } from '../TicketSection';
import { Checkbox } from '@/shared/components/ui/checkbox';
import type { EventFormat } from '../../../types/event.types';
import styles from '../CreateEventForm.module.scss';

interface Props {
  tickets: AddedTicket[];
  onTicketsChange: (tickets: AddedTicket[]) => void;
  isFree: boolean;
  onIsFreeChange: (isFree: boolean) => void;
  ticketsError: string | null;
  mutationError: string | null;
  format?: EventFormat;
}

export function EventTicketsStep({
  tickets, onTicketsChange, isFree, onIsFreeChange, ticketsError, mutationError, format,
}: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.checkboxRow}>
        <Checkbox
          id="eventIsFree"
          checked={isFree}
          onCheckedChange={(v) => onIsFreeChange(v === true)}
        />
        <label htmlFor="eventIsFree" className={styles.checkboxText}>
          <strong>Evento gratuito</strong>
          <span className={styles.checkboxHint}>
            Acesso livre — os espectadores reivindicam sem pagar. Não há ingressos pagos.
          </span>
        </label>
      </div>

      {isFree ? (
        <p className={styles.stepDesc}>
          Um ingresso “Acesso Gratuito” será criado automaticamente. Você pode voltar a
          cobrar depois, na página do evento.
        </p>
      ) : (
        <>
          <TicketSection tickets={tickets} onChange={onTicketsChange} format={format} />
          {ticketsError && <p className={styles.error}>{ticketsError}</p>}
        </>
      )}

      {mutationError && (
        <p className={`${styles.error} ${styles.globalError}`}>{mutationError}</p>
      )}
    </section>
  );
}
