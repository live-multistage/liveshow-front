import { formatPrice } from '@/features/events';
import type { CheckoutSession } from '../types/checkout.types';
import styles from './OrderSummaryCard.module.scss';

interface Props {
  session: CheckoutSession;
  discountAmount?: number;
}

export function OrderSummaryCard({ session, discountAmount = 0 }: Props) {
  const serviceFee = 0;

  return (
    <div className={styles.card}>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Subtotal</span>
          <span className={styles.rowValue}>{formatPrice(session.totalAmount + discountAmount, session.currency)}</span>
        </div>
        {discountAmount > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>Desconto</span>
            <span className={`${styles.rowValue} ${styles.discount}`}>−{formatPrice(discountAmount, session.currency)}</span>
          </div>
        )}
        <div className={styles.row}>
          <span className={styles.rowLabel}>Taxas de serviço</span>
          <span className={styles.rowValue}>{serviceFee ? formatPrice(serviceFee, session.currency) : 'Grátis'}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.total}>
        <span className={styles.totalLabel}>Total</span>
        <div className={styles.totalRight}>
          <span className={styles.currency}>{session.currency ?? 'BRL'}</span>
          <span className={styles.totalValue}>{formatPrice(session.totalAmount, session.currency)}</span>
        </div>
      </div>
    </div>
  );
}
