'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import styles from './CheckoutResultContent.module.scss';

interface Props {
  eventId: string;
  ticketProductId?: string;
}

export function CheckoutFailedContent({ eventId, ticketProductId }: Props) {
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
          <Link href={retryUrl} className={styles.primary}>
            Tentar novamente
          </Link>
          <Link href={`/events/${eventId}`} className={styles.secondary}>
            Voltar ao evento
          </Link>
        </div>
      </div>
    </div>
  );
}
