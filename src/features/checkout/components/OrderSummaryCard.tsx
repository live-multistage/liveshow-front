import { formatPrice } from '@/features/events';
import type { CheckoutSession } from '../types/checkout.types';
import styles from './OrderSummaryCard.module.scss';

interface Props {
  session: CheckoutSession;
}

export function OrderSummaryCard({ session }: Props) {
  return (
    <div className={styles.card}>
      <p className={styles.label}>Resumo do pedido</p>

      <div className={styles.lines}>
        <div className={styles.line}>
          <span className={styles.lineLabel}>Total</span>
          <span>{formatPrice(session.totalAmount)}</span>
        </div>
      </div>

      <div className={styles.total}>
        <span>A pagar</span>
        <span className={styles.totalValue}>{formatPrice(session.totalAmount)}</span>
      </div>
    </div>
  );
}
