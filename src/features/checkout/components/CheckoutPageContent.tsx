'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/features/events';
import { useCartStore, CAPABILITY_LABELS } from '@/features/cart';
import { useAuth } from '@/features/account';
import styles from './CheckoutPageContent.module.scss';

export function CheckoutPageContent() {
  const router = useRouter();
  const item = useCartStore((s) => s.item);
  const { user } = useAuth();

  useEffect(() => {
    if (!item) router.replace('/cart');
  }, [item, router]);

  if (!item) return null;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Checkout</h1>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Resumo do pedido</p>
        <p className={styles.event}>{item.eventTitle}</p>
        <p className={styles.ticket}>{item.ticketName}</p>
        <div className={styles.badges}>
          {item.capabilities.map((c) => (
            <span key={c} className={styles.badge}>{CAPABILITY_LABELS[c]}</span>
          ))}
          {item.camerasLimit != null && (
            <span className={styles.badge}>{item.camerasLimit} câmeras</span>
          )}
        </div>
        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.total}>{formatPrice(item.price)}</span>
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
