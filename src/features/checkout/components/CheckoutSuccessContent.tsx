'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, Ticket } from 'lucide-react';
import styles from './CheckoutResultContent.module.scss';

interface Props {
  eventId: string;
}

export function CheckoutSuccessContent({ eventId }: Props) {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.icon} ${styles.iconSuccess}`}>
          <CheckCircle2 size={40} />
        </div>
        <h1 className={styles.title}>Pagamento confirmado!</h1>
        <p className={styles.desc}>Seu ingresso foi gerado com sucesso. Aproveite o evento!</p>

        <div className={styles.badge}>
          <Ticket size={14} />
          Ingresso disponível na sua conta
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primary}
            onClick={() => router.push(`/events/${eventId}`)}
          >
            Ver evento
          </button>
          <button
            className={styles.secondary}
            onClick={() => router.push('/events')}
          >
            Explorar mais eventos
          </button>
        </div>
      </div>
    </div>
  );
}
