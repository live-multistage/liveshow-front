import { CalendarDays, MapPin, Building2 } from 'lucide-react';
import { formatDate } from '@/features/events';
import type { EventResponse } from '@/features/events';
import styles from './EventSummaryCard.module.scss';

interface Props {
  event: EventResponse;
  organizationName?: string;
}

export function EventSummaryCard({ event, organizationName }: Props) {
  return (
    <div className={styles.card}>
      {event.bannerUrl && (
        <div
          className={styles.banner}
          style={{ backgroundImage: `url(${event.bannerUrl})` }}
          aria-hidden
        />
      )}
      <div className={styles.body}>
        <p className={styles.title}>{event.title}</p>
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <CalendarDays size={13} />
            {formatDate(event.startsAt)}
          </span>
          {(event.venue || event.city) && (
            <span className={styles.metaItem}>
              <MapPin size={13} />
              {[event.venue, event.city].filter(Boolean).join(', ')}
            </span>
          )}
          {organizationName && (
            <span className={styles.metaItem}>
              <Building2 size={13} />
              {organizationName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
