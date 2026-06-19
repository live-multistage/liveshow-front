'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import styles from './CheckoutResultContent.module.scss';

interface Props {
  eventId: string;
  ticketProductId?: string;
}

export function CheckoutFailedContent({ eventId, ticketProductId }: Props) {
  const router = useRouter();

  const retryUrl = ticketProductId
    ? `/events/${eventId}/checkout?ticketId=${ticketProductId}`
    : `/events/${eventId}`;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.icon} ${styles.iconFailed}`}>
          <XCircle size={40} />
        </div>
        <h1 className={styles.title}>Pagamento não processado</h1>
        <p className={styles.desc}>
          Não foi possível concluir o pagamento. Verifique seus dados e tente novamente.
        </p>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => router.push(retryUrl)}>
            Tentar novamente
          </button>
          <button
            className={styles.secondary}
            onClick={() => router.push(`/events/${eventId}`)}
          >
            Voltar ao evento
          </button>
        </div>
      </div>
    </div>
  );
}
