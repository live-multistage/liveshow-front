'use client';

import Link from 'next/link';
import { Building2, X, Tag, Ticket } from 'lucide-react';
import { formatPrice } from '@/features/events';
import { useCartStore } from '../stores/cart.store';
import { CAPABILITY_LABELS } from '../utils/capability-labels';
import { computeCartTotals } from '../utils/totals';
import styles from './CartPageContent.module.scss';

export function CartPageContent() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyWrap}>
          <h1 className={styles.heading}>Carrinho</h1>
          <div className={styles.empty}>
            <Ticket size={32} className={styles.emptyIcon} />
            <p>Seu carrinho está vazio.</p>
            <Link href="/events" className={styles.emptyLink}>Explorar eventos →</Link>
          </div>
        </div>
      </div>
    );
  }

  const totals = computeCartTotals(items);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Left — cart items */}
        <section className={styles.left}>
          <h1 className={styles.heading}>Carrinho</h1>
          <ul className={styles.card}>
            {items.map((item, i) => (
              <li
                key={item.eventId}
                className={`${styles.item} ${i > 0 ? styles.itemDivided : ''}`}
              >
                <div
                  className={styles.thumb}
                  style={item.eventImage ? { backgroundImage: `url(${item.eventImage})` } : undefined}
                />

                <div className={styles.itemBody}>
                  {item.organizerName && (
                    <div className={styles.organizer}>
                      <Building2 size={14} />
                      <span>{item.organizerName}</span>
                    </div>
                  )}
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
                  <p className={styles.price}>{formatPrice(item.price)}</p>
                </div>

                <button
                  className={styles.removeBtn}
                  onClick={() => removeItem(item.eventId)}
                  aria-label={`Remover ${item.eventTitle}`}
                >
                  <X size={20} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Right — order summary */}
        <aside className={styles.right}>
          <h2 className={styles.heading}>Continue comprando</h2>
          <div className={styles.summary}>
            <p className={styles.summaryTitle}>Order Summary</p>

            <div className={styles.promo}>
              <Tag size={18} className={styles.promoIcon} />
              <input
                className={styles.promoInput}
                placeholder="Insira seu código promocional"
                aria-label="Código promocional"
              />
            </div>

            <div className={styles.lines}>
              <div className={styles.lineRow}>
                <span className={styles.lineLabel}>
                  Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})
                </span>
                <span className={styles.lineValue}>{formatPrice(totals.subtotal)}</span>
              </div>
              {totals.lines.map((line) => (
                <div key={line.key} className={styles.lineRow}>
                  <span className={styles.lineLabel}>{line.label}</span>
                  <span className={styles.lineValue}>{formatPrice(line.amount)}</span>
                </div>
              ))}
            </div>

            <div className={styles.totalRow}>
              <span>Total</span>
              <span>{formatPrice(totals.total)}</span>
            </div>

            <Link href="/checkout" className={styles.checkout}>Ir para o checkout</Link>
            <Link href="/events" className={styles.continue}>Continuar procurando eventos</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
