'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Chip } from '@live-show/design-system';
import type { EventResponse, EventStatus } from '../../types/event.types';
import styles from './EventDashboardCard.module.scss';

const STATUS_MOD: Record<EventStatus, string> = {
  DRAFT:     styles.statusDraft,
  PUBLISHED: styles.statusScheduled,
  SCHEDULED: styles.statusScheduled,
  LIVE:      styles.statusLive,
  FINISHED:  styles.statusFinished,
  CANCELLED: styles.statusCancelled,
};

// Off-corner radial glow, only for the statuses the spec highlights.
const STATUS_GLOW: Partial<Record<EventStatus, string>> = {
  LIVE:      styles.glowLive,
  PUBLISHED: styles.glowScheduled,
  SCHEDULED: styles.glowScheduled,
};

interface Props {
  event: EventResponse;
}

export function EventDashboardCard({ event }: Props) {
  const t = useTranslations('eventCard');
  const tCollab = useTranslations('collaborations');
  const locale = useLocale();
  const location = [event.venue, event.city, event.country].filter(Boolean).join(', ');
  const glow = STATUS_GLOW[event.status];

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <Link href={`/dashboard/events/${event.id}`} className={styles.card}>
      {glow && <span className={`${styles.glow} ${glow}`} />}
      <div className={styles.body}>
        <div className={styles.cardTop}>
          <div className={styles.cardTopLeft}>
            <span className={`${styles.status} ${STATUS_MOD[event.status]}`}>
              {event.status === 'LIVE' && <span className={styles.livePulse} />}
              {t(`status.${event.status}`)}
            </span>
            {event.collaborationRole === 'COLLABORATOR' && (
              <Chip className={styles.collabChip} variant="default">
                {tCollab('collabChip')}
              </Chip>
            )}
          </div>
          <span className={styles.cameras}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="13" rx="2" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
            {t('cameras', { count: event.camerasCount })}
          </span>
        </div>

        <h3 className={styles.title}>{event.title}</h3>

        {location && (
          <p className={styles.location}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {location}
          </p>
        )}

        <p className={styles.description}>{event.description}</p>

        <div className={styles.dates}>
          <span>{formatDate(event.startsAt)}</span>
          <svg width="20" height="12" viewBox="0 0 24 12" fill="none" stroke="#5a5a62" strokeWidth="2">
            <path d="M2 6h18M16 2l4 4-4 4" />
          </svg>
          <span>{formatDate(event.endsAt)}</span>
        </div>
      </div>
    </Link>
  );
}
