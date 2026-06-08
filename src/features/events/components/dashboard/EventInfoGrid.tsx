'use client';

import { Calendar, Clock, Camera, Ticket } from 'lucide-react';
import { formatDate, formatTime, formatDuration } from '../../utils/event-formatters';
import type { EventResponse } from '../../types/event.types';
import styles from './EventDashboardDetailContent.module.scss';

interface Props {
  event: EventResponse;
  ticketCount: number;
}

export function EventInfoGrid({ event, ticketCount }: Props) {
  return (
    <div className={styles.infoGrid}>
      <div className={styles.infoCard}>
        <Calendar size={14} className={styles.infoIcon} />
        <div>
          <p className={styles.infoLabel}>Data</p>
          <p className={styles.infoValue}>{formatDate(event.startsAt)}</p>
        </div>
      </div>
      <div className={styles.infoCard}>
        <Clock size={14} className={styles.infoIcon} />
        <div>
          <p className={styles.infoLabel}>Horário</p>
          <p className={styles.infoValue}>
            {formatTime(event.startsAt)} · {formatDuration(event.startsAt, event.endsAt)}
          </p>
        </div>
      </div>
      <div className={styles.infoCard}>
        <Camera size={14} className={styles.infoIcon} />
        <div>
          <p className={styles.infoLabel}>Câmeras</p>
          <p className={styles.infoValue}>
            {event.camerasCount} ângulo{event.camerasCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className={styles.infoCard}>
        <Ticket size={14} className={styles.infoIcon} />
        <div>
          <p className={styles.infoLabel}>Ingressos</p>
          <p className={styles.infoValue}>
            {ticketCount} tipo{ticketCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
