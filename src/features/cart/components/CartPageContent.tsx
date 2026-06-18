'use client';

import Link from 'next/link';
import { X, Tag, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/features/events';
import { CAPABILITY_LABELS } from '../utils/capability-labels';
import { useCartQuery } from '../queries/cart.queries';
import { useRemoveFromCartMutation } from '../mutations/cart.mutations';
import type { CartView } from '../services/cart.service';
import styles from './CartPageContent.module.scss';

interface Props {
  initialCart?: CartView;
}

export function CartPageContent({ initialCart }: Props) {
  const t = useTranslations('cart');
  const { data } = useCartQuery(initialCart);
  const removeItem = useRemoveFromCartMutation();

  const items = data?.items ?? [];
  const totals = data?.totals;

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyWrap}>
          <h1 className={styles.heading}>{t('title')}</h1>
          <div className={styles.empty}>
            <Ticket size={32} className={styles.emptyIcon} />
            <p>{t('empty')}</p>
            <Link href="/events" className={styles.emptyLink}>{t('exploreEvents')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Left — cart items */}
        <section className={styles.left}>
          <h1 className={styles.heading}>{t('title')}</h1>
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
                  <p className={styles.event}>{item.eventTitle}</p>
                  <p className={styles.ticket}>{item.ticketName}</p>
                  <div className={styles.badges}>
                    {item.capabilities.map((c) => (
                      <span key={c} className={styles.badge}>{CAPABILITY_LABELS[c]}</span>
                    ))}
                    {item.camerasLimit != null && (
                      <span className={styles.badge}>{t('cameras', { count: item.camerasLimit })}</span>
                    )}
                  </div>
                  <p className={styles.price}>{formatPrice(item.price)}</p>
                </div>

                <button
                  className={styles.removeBtn}
                  onClick={() => removeItem.mutate(item.eventId)}
                  disabled={removeItem.isPending}
                  aria-label={t('removeItem', { title: item.eventTitle })}
                >
                  <X size={20} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Right — order summary (server-computed totals) */}
        <aside className={styles.right}>
          <h2 className={styles.heading}>{t('continueShopping')}</h2>
          <div className={styles.summary}>
            <p className={styles.summaryTitle}>{t('orderSummary')}</p>

            <div className={styles.promo}>
              <Tag size={18} className={styles.promoIcon} />
              <input
                className={styles.promoInput}
                placeholder={t('promoPlaceholder')}
                aria-label={t('promoPlaceholder')}
              />
            </div>

            <div className={styles.lines}>
              <div className={styles.lineRow}>
                <span className={styles.lineLabel}>
                  {t('subtotal', { count: items.length })}
                </span>
                <span className={styles.lineValue}>{formatPrice(totals?.subtotal ?? 0)}</span>
              </div>
              {totals?.lines.map((line) => (
                <div key={line.key} className={styles.lineRow}>
                  <span className={styles.lineLabel}>{line.label}</span>
                  <span className={styles.lineValue}>{formatPrice(line.amount)}</span>
                </div>
              ))}
            </div>

            <div className={styles.totalRow}>
              <span>{t('total')}</span>
              <span>{formatPrice(totals?.total ?? 0)}</span>
            </div>

            <Link href="/checkout" className={styles.checkout}>{t('goToCheckout')}</Link>
            <Link href="/events" className={styles.continue}>{t('browseEvents')}</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
