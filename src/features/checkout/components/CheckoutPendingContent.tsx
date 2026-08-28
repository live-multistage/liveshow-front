'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { useOrderQuery } from '../mutations/checkout.mutations';
import styles from './CheckoutResultContent.module.scss';

interface Props {
  orderId?: string;
}

export function CheckoutPendingContent({ orderId }: Props) {
  const router = useRouter();

  const orderQuery = useOrderQuery(orderId ?? null);

  useEffect(() => {
    const status = orderQuery.data?.status;
    if (status === 'PAID') {
      router.replace(`/checkout/success?orderId=${orderId ?? ''}`);
      return;
    }
    // CANCELLED and EXPIRED are both dead ends — the cart is still there.
    if (status === 'CANCELLED' || status === 'EXPIRED') {
      router.replace('/checkout');
    }
  }, [orderQuery.data, orderId, router]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.icon} ${styles.iconPending}`}>
          <Clock size={40} />
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
          <Link href="/checkout" className={styles.secondary}>
            Voltar ao checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
