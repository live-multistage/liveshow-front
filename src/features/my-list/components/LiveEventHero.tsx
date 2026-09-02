'use client';

import Link from 'next/link';
import { eventHref } from '@/features/events/utils/slug';
import { useLocale, useTranslations } from 'next-intl';
import { Play } from 'lucide-react';
import { coverGradient, coverUrl, placeLabel } from '@/shared/utils/event-cover';
import { timeLabel } from '../utils/format';
import type { AccessibleEvent } from '../types/my-list.types';
import styles from './LiveEventHero.module.scss';

export function LiveEventHero({ event }: { event: AccessibleEvent }) {
  const t = useTranslations('myList');
  const locale = useLocale();
  const cover = coverUrl(event);
  const place = placeLabel(event);

  return (
    <article className={styles.hero}>
      <div className={styles.cover} style={{ background: coverGradient(event.id) }}>
        {cover && <img src={cover} alt="" className={styles.image} />}
        <div className={styles.scrim} aria-hidden="true" />
        <span className={styles.liveBadge}>
          <span className={styles.pulse} aria-hidden="true" />
          {t('liveBadge')}
        </span>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{event.title}</h3>
        {place && <p className={styles.place}>{place}</p>}
        <p className={styles.note}>{t('startedAt', { time: timeLabel(event.startsAt, locale) })}</p>

        <div className={styles.actions}>
          <Link href={`/live/${event.id}`} className={styles.primary}>
            <Play size={13} fill="currentColor" strokeWidth={0} />
            {t('watchLive')}
          </Link>
          <Link href={eventHref(event)} className={styles.secondary}>
            {t('details')}
          </Link>
        </div>
      </div>
    </article>
  );
}
