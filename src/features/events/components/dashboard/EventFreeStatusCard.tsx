'use client';

import { Gift } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { useSetEventFreeStatusMutation } from '../../mutations/set-free-status.mutation';
import styles from './EventFreeStatusCard.module.scss';

interface Props {
  eventId: string;
  isFree: boolean;
  ticketCount: number;
}

// Toggle an event between paid and free. Marking free requires no existing paid
// tickets (the backend rejects otherwise), so the action is gated on that.
export function EventFreeStatusCard({ eventId, isFree, ticketCount }: Props) {
  const mutation = useSetEventFreeStatusMutation(eventId);
  const blockedByTickets = !isFree && ticketCount > 0;

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <Gift size={16} />
        <div>
          <h3 className={styles.title}>{isFree ? 'Evento gratuito' : 'Acesso pago'}</h3>
          <p className={styles.hint}>
            {isFree
              ? 'Espectadores reivindicam o acesso sem pagar.'
              : blockedByTickets
                ? 'Remova os ingressos pagos para tornar o evento gratuito.'
                : 'Torne o evento gratuito — um ingresso “Acesso Gratuito” é criado e o acesso passa a ser livre.'}
          </p>
        </div>
      </div>

      <Button
        variant={isFree ? 'outline' : 'primary'}
        isLoading={mutation.isPending}
        disabled={blockedByTickets}
        onClick={() => mutation.mutate(!isFree)}
      >
        {isFree ? 'Voltar a cobrar' : 'Tornar gratuito'}
      </Button>

      {mutation.error && <p className={styles.error}>{mutation.error.message}</p>}
    </section>
  );
}
