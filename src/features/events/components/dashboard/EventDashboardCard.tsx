'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { EventResponse, EventStatus } from '../../types/event.types';
import styles from './EventDashboardCard.module.scss';

const STATUS_MOD: Record<EventStatus, string> = {
  DRAFT:     styles.statusDraft,
  PUBLISHED: styles.statusPublished,
  SCHEDULED: styles.statusPublished,
  LIVE:      styles.statusLive,
  FINISHED:  styles.statusFinished,
  CANCELLED: styles.statusCancelled,
};

interface Props {
  event: EventResponse;
}

export function EventDashboardCard({ event }: Props) {
  const t = useTranslations('eventCard');
  const locale = useLocale();
  const location = [event.venue, event.city, event.country].filter(Boolean).join(', ');

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <Link href={`/dashboard/events/${event.id}`} className={styles.card}>
      <div className={styles.cardTop}>
        <span className={`${styles.status} ${STATUS_MOD[event.status]}`}>
          {event.status === 'LIVE' && <span className={styles.livePulse} />}
          {t(`status.${event.status}`)}
        </span>
        <span className={styles.cameras}>
          {t('cameras', { count: event.camerasCount })}
        </span>
      </div>

      <h3 className={styles.title}>{event.title}</h3>

      {location && <p className={styles.location}>{location}</p>}

      <p className={styles.description}>{event.description}</p>

      <div className={styles.dates}>
        <span>{formatDate(event.startsAt)}</span>
        <span className={styles.dateSep}>→</span>
        <span>{formatDate(event.endsAt)}</span>
      </div>
    </Link>
  );
}
