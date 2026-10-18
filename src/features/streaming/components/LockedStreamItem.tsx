'use client';

import { Lock, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/features/events/utils/event-formatters';
import type { LockedStreamOffer } from '../types/live.types';
import styles from './LockedStreamItem.module.scss';

interface Props {
  locked: LockedStreamOffer;
  status: string;
  pending: boolean;
  onUnlock: (locked: LockedStreamOffer) => void;
}

// A transmission the viewer can buy: never a stream choice, only a price and
// the "Liberar evento completo" action.
export function LockedStreamItem({ locked, status, pending, onUnlock }: Props) {
  const t = useTranslations('player');
  return (
    <div className={styles.item}>
      <div className={styles.row}>
        <Lock size={16} aria-hidden />
        <span className={styles.text}>
          <span className={styles.title}>{locked.title}</span>
          <span className={styles.status}>{status}</span>
        </span>
        <span className={styles.price}>{formatPrice(locked.offer.priceCents / 100, locked.offer.currency)}</span>
      </div>
      <button type="button" className={styles.unlockBtn} disabled={pending} onClick={() => onUnlock(locked)}>
        <Ticket size={15} aria-hidden />
        {t('unlockFullEvent')}
      </button>
    </div>
  );
}
