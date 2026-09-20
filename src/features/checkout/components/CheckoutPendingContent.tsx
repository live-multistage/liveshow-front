'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { useOrderQuery, usePixPaymentAction } from '../mutations/checkout.mutations';
import { PixPaymentPanel } from './PixPaymentPanel';
import { normalizeError } from '@/lib/http/errors';
import styles from './CheckoutResultContent.module.scss';

interface Props {
  orderId?: string;
}

export function CheckoutPendingContent({ orderId }: Props) {
  const router = useRouter();

  const orderQuery = useOrderQuery(orderId ?? null);
  const pixActionQuery = usePixPaymentAction(orderId ?? null, orderQuery.data?.status === 'PENDING');

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

  const order = orderQuery.data;
  const pixAction = pixActionQuery.data;

  if (order && pixAction) {
    return (
      <div className={styles.page}>
        <PixPaymentPanel action={pixAction} amount={order.totalAmount} currency={order.currency} />
      </div>
    );
  }

  // A 404 means this order simply has no Pix action (not a Pix order) — the
  // generic card below is correct. Any other error (5xx, network) is a
  // fetch failure the buyer can retry without losing their order.
  if (order && pixActionQuery.isError && normalizeError(pixActionQuery.error).status !== 404) {
    return (
      <div className={styles.page}>
        <PixPaymentPanel
          amount={order.totalAmount}
          currency={order.currency}
          error
          onRetry={() => pixActionQuery.refetch()}
        />
      </div>
    );
  }

  // Known ASAAS+PIX order, action just hasn't arrived yet (and hasn't 404'd —
  // that's a real "no Pix action" case handled by the generic card below):
  // show the Pix loading shimmer instead of the generic "Aguardando" card.
  const isAsaasPix = order?.provider === 'ASAAS' && order?.method === 'PIX';
  if (order && isAsaasPix && !pixActionQuery.isError) {
    return (
      <div className={styles.page}>
        <PixPaymentPanel amount={order.totalAmount} currency={order.currency} isLoading />
      </div>
    );
  }

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
