'use client';

import { Calendar, Clock, Camera, Ticket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate, formatTime, formatDuration } from '../../utils/event-formatters';
import type { EventResponse } from '../../types/event.types';
import styles from './EventDashboardDetailContent.module.scss';

interface Props {
  event: EventResponse;
  ticketCount: number;
}

export function EventInfoGrid({ event, ticketCount }: Props) {
  const t = useTranslations('eventDetail');

  return (
    <div className={styles.infoGrid}>
      <div className={styles.infoCard}>
        <Calendar size={14} className={styles.infoIcon} />
        <div>
          <p className={styles.infoLabel}>{t('infoDate')}</p>
          <p className={styles.infoValue}>{formatDate(event.startsAt)}</p>
        </div>
      </div>
      <div className={styles.infoCard}>
        <Clock size={14} className={styles.infoIcon} />
        <div>
          <p className={styles.infoLabel}>{t('infoTime')}</p>
          <p className={styles.infoValue}>
            {formatTime(event.startsAt)} · {formatDuration(event.startsAt, event.endsAt)}
          </p>
        </div>
      </div>
      <div className={styles.infoCard}>
        <Camera size={14} className={styles.infoIcon} />
        <div>
          <p className={styles.infoLabel}>{t('infoCameras')}</p>
          <p className={styles.infoValue}>{t('cameras', { count: event.camerasCount })}</p>
        </div>
      </div>
      <div className={styles.infoCard}>
        <Ticket size={14} className={styles.infoIcon} />
        <div>
          <p className={styles.infoLabel}>{t('infoTickets')}</p>
          <p className={styles.infoValue}>{t('ticketTypes', { count: ticketCount })}</p>
        </div>
      </div>
    </div>
  );
}
