'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Play } from 'lucide-react';
import { coverGradient, coverUrl, placeLabel } from '@/shared/utils/event-cover';
import { dateLabel, durationLabel } from '../utils/format';
import type { AccessibleEvent } from '../types/my-list.types';
import styles from './ReplayCard.module.scss';

export function ReplayCard({ event }: { event: AccessibleEvent }) {
  const t = useTranslations('myList');
  const locale = useLocale();
  const cover = coverUrl(event);
  const place = placeLabel(event);
  const duration = durationLabel(event.startsAt, event.endsAt);

  return (
    <Link href={`/replay/${event.id}`} className={styles.card}>
      <div className={styles.cover} style={{ background: coverGradient(event.id) }}>
        {cover && <img src={cover} alt="" className={styles.image} />}
        <div className={styles.scrim} aria-hidden="true" />
        <span className={styles.tag}>{t('badges.replay')}</span>
        {duration && <span className={styles.duration}>{duration}</span>}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.meta}>
          {dateLabel(event.startsAt, locale)}
          {place && ` · ${place}`}
        </p>
        <span className={styles.action}>
          <Play size={11} fill="currentColor" strokeWidth={0} />
          {t('watchReplay')}
        </span>
      </div>
    </Link>
  );
}
