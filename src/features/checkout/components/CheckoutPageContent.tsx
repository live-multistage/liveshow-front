'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/features/events';
import { CAPABILITY_LABELS, useCartQuery } from '@/features/cart';
import { useAuth } from '@/features/account';
import { Badge } from '@/shared/components/ui/badge';
import styles from './CheckoutPageContent.module.scss';

export function CheckoutPageContent() {
  const t = useTranslations('checkout');
  const router = useRouter();
  const { data, isLoading } = useCartQuery();
  const { user } = useAuth();

  const items = data?.items ?? [];
  const totals = data?.totals;

  useEffect(() => {
    if (!isLoading && items.length === 0) router.replace('/cart');
  }, [isLoading, items.length, router]);

  if (items.length === 0 || !totals) return null;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{t('title')}</h1>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('orderSummary')}</p>
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
                  <Badge variant="outline">{t('cameras', { count: item.camerasLimit })}</Badge>
                )}
              </div>
            </div>
            <span className={styles.itemPrice}>{formatPrice(item.price)}</span>
          </div>
        ))}

        <div className={styles.summaryRow}>
          <span>{t('subtotal')}</span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>
        {totals.lines.map((line) => (
          <div key={line.key} className={styles.summaryRow}>
            <span>{line.label}</span>
            <span>{formatPrice(line.amount)}</span>
          </div>
        ))}
        <div className={styles.totalRow}>
          <span>{t('total')}</span>
          <span className={styles.total}>{formatPrice(totals.total)}</span>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('buyer')}</p>
        <div className={styles.row}><span>{t('name')}</span><span>{user?.displayName ?? '—'}</span></div>
        <div className={styles.row}><span>{t('email')}</span><span>{user?.email ?? '—'}</span></div>
      </div>

      <button className={styles.cta} disabled>{t('paymentSoon')}</button>
      <p className={styles.note}>{t('paymentNote')}</p>
    </div>
  );
}
