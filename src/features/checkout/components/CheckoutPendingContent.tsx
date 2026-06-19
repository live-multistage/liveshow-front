'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, QrCode } from 'lucide-react';
import { usePaymentStatusQuery } from '../mutations/checkout.mutations';
import styles from './CheckoutResultContent.module.scss';

interface Props {
  eventId: string;
  paymentId?: string;
}

export function CheckoutPendingContent({ eventId, paymentId }: Props) {
  const router = useRouter();

  const statusQuery = usePaymentStatusQuery(paymentId ?? null, !!paymentId);

  useEffect(() => {
    const status = statusQuery.data?.status;
    if (status === 'COMPLETED') router.replace(`/events/${eventId}/checkout/success`);
    if (status === 'FAILED') router.replace(`/events/${eventId}/checkout/failed`);
  }, [statusQuery.data?.status, eventId, router]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.icon} ${styles.iconPending}`}>
          {paymentId ? <QrCode size={40} /> : <Clock size={40} />}
        </div>
        <h1 className={styles.title}>Aguardando confirmação</h1>
        <p className={styles.desc}>
          O pagamento está sendo processado. Você receberá uma confirmação assim que for aprovado.
        </p>

        <div className={styles.pendingNote}>
          <span className={styles.pendingDot} />
          Verificando pagamento…
        </div>

        <div className={styles.actions}>
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
