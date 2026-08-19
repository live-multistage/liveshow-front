'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { isVenueOnly } from '../utils/event-action';
import { placeLabel } from '@/shared/utils/event-cover';
import { countdownLabel, dayLabel, timeLabel } from '../utils/format';
import type { AccessibleEvent } from '../types/my-list.types';
import styles from './UpcomingEventRow.module.scss';

export function UpcomingEventRow({ event }: { event: AccessibleEvent }) {
  const t = useTranslations('myList');
  const locale = useLocale();
  const { day, month } = dayLabel(event.startsAt, locale);
  const place = placeLabel(event);
  const venueOnly = isVenueOnly(event);
  const cancelled = event.status === 'CANCELLED';

  return (
    <article className={styles.row}>
      <div className={styles.date}>
        <span className={styles.day}>{day}</span>
        <span className={styles.month}>{month}</span>
      </div>

      <div className={styles.main}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{event.title}</h3>
          {cancelled && <span className={styles.tagMuted}>{t('badges.cancelled')}</span>}
          {!cancelled && venueOnly && <span className={styles.tagMuted}>{t('badges.venue')}</span>}
          {!cancelled && !venueOnly && (
            <span className={styles.tagAccent}>{t('badges.stream')}</span>
          )}
        </div>
        <p className={styles.meta}>
          {timeLabel(event.startsAt, locale)}
          {place && ` · ${place}`}
        </p>
        {/* Sem esta linha, a ausência do botão "Assistir" parece defeito da
            página em vez do que é: um ingresso que não cobre transmissão. */}
        {venueOnly && <p className={styles.note}>{t('venueOnly')}</p>}
      </div>

      <div className={styles.side}>
        {!cancelled && (
          <span className={styles.countdown}>{countdownLabel(event.startsAt, locale)}</span>
        )}
        <Link href={`/events/${event.id}`} className={styles.details}>
          {t('details')}
        </Link>
      </div>
    </article>
  );
}
