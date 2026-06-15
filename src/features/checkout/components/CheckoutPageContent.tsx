'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/features/events';
import { useCartStore, CAPABILITY_LABELS, computeCartTotals } from '@/features/cart';
import { useAuth } from '@/features/account';
import { Badge } from '@/shared/components/ui/badge';
import styles from './CheckoutPageContent.module.scss';

export function CheckoutPageContent() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const { user } = useAuth();

  useEffect(() => {
    if (items.length === 0) router.replace('/cart');
  }, [items, router]);

  if (items.length === 0) return null;

  const totals = computeCartTotals(items);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Checkout</h1>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Resumo do pedido</p>
        {items.map((item) => (
          <div key={item.eventId} className={styles.orderItem}>
            <div>
              <p className={styles.event}>{item.eventTitle}</p>
              <p className={styles.ticket}>{item.ticketName}</p>
              <div className={styles.badges}>
                {item.capabilities.map((c) => (
                  <Badge key={c} variant="secondary">{CAPABILITY_LABELS[c]}</Badge>
                ))}
                {item.camerasLimit != null && (
                  <Badge variant="outline">{item.camerasLimit} câmeras</Badge>
                )}
              </div>
            </div>
            <span className={styles.itemPrice}>{formatPrice(item.price)}</span>
          </div>
        ))}

        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>
        {totals.lines.map((line) => (
          <div key={line.key} className={styles.summaryRow}>
            <span>{line.label}</span>
            <span>{formatPrice(line.amount)}</span>
          </div>
        ))}
        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.total}>{formatPrice(totals.total)}</span>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Comprador</p>
        <div className={styles.row}><span>Nome</span><span>{user?.displayName ?? '—'}</span></div>
        <div className={styles.row}><span>E-mail</span><span>{user?.email ?? '—'}</span></div>
      </div>

      <button className={styles.cta} disabled>Pagamento em breve</button>
      <p className={styles.note}>O pagamento será habilitado em breve.</p>
    </div>
  );
}
