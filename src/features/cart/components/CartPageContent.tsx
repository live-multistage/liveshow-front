'use client';

import Link from 'next/link';
import { formatPrice } from '@/features/events';
import { useCartStore } from '../stores/cart.store';
import { CAPABILITY_LABELS } from '../utils/capability-labels';
import styles from './CartPageContent.module.scss';

export function CartPageContent() {
  const item = useCartStore((s) => s.item);
  const clear = useCartStore((s) => s.clear);

  if (!item) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>Carrinho</h1>
        <div className={styles.empty}>
          <p>Seu carrinho está vazio.</p>
          <Link href="/events" className={styles.emptyLink}>Explorar eventos →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Carrinho</h1>
      <div className={styles.card}>
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
        <div className={styles.actions}>
          <button onClick={clear} className={styles.remove}>Remover</button>
          <Link href="/checkout" className={styles.primary}>Ir para o checkout</Link>
        </div>
      </div>
    </div>
  );
}
