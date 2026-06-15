'use client';

import Link from 'next/link';
import { Trash2, Ticket } from 'lucide-react';
import { formatPrice } from '@/features/events';
import { Badge } from '@/shared/components/ui/badge';
import { useCartStore } from '../stores/cart.store';
import { CAPABILITY_LABELS } from '../utils/capability-labels';
import { computeCartTotals } from '../utils/totals';
import styles from './CartPageContent.module.scss';

export function CartPageContent() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  if (items.length === 0) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>Carrinho</h1>
        <div className={styles.empty}>
          <Ticket size={32} className={styles.emptyIcon} />
          <p>Seu carrinho está vazio.</p>
          <Link href="/events" className={styles.emptyLink}>Explorar eventos →</Link>
        </div>
      </div>
    );
  }

  const totals = computeCartTotals(items);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Carrinho</h1>
        <span className={styles.count}>
          {items.length} {items.length === 1 ? 'ingresso' : 'ingressos'}
        </span>
      </div>

      <div className={styles.layout}>
        {/* Left — ticket list */}
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.eventId} className={styles.item}>
              <div className={styles.itemMain}>
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
              <div className={styles.itemSide}>
                <span className={styles.itemPrice}>{formatPrice(item.price)}</span>
                <button
                  className={styles.remove}
                  onClick={() => removeItem(item.eventId)}
                  aria-label={`Remover ${item.eventTitle}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Right — order summary (extensible lines) */}
        <aside className={styles.summary}>
          <p className={styles.summaryTitle}>Resumo</p>

          <div className={styles.summaryLines}>
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
          </div>

          <div className={styles.summaryTotal}>
            <span>Total</span>
            <span className={styles.summaryTotalValue}>{formatPrice(totals.total)}</span>
          </div>

          <Link href="/checkout" className={styles.checkout}>Ir para o checkout</Link>
          <button onClick={clear} className={styles.clear}>Limpar carrinho</button>
        </aside>
      </div>
    </div>
  );
}
