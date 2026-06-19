'use client';

import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import type { EventResponse, EventStatus } from '../../types/event.types';
import styles from './EventDashboardCard.module.scss';

const STATUS_MOD: Record<EventStatus, string> = {
  DRAFT:     styles.statusDraft,
  PUBLISHED: styles.statusPublished,
  LIVE:      styles.statusLive,
  FINISHED:  styles.statusFinished,
  CANCELLED: styles.statusCancelled,
};

interface Props {
  event: EventResponse;
}

export function EventDashboardCard({ event }: Props) {
  const router = useRouter();
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
    <div
      className={styles.card}
      onClick={() => router.push(`/dashboard/events/${event.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/dashboard/events/${event.id}`); }}
    >
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
    </div>
  );
}
