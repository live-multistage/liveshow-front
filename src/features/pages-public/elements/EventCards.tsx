import type { ResolvedRailEvent } from '@live-show/api-contracts';
import { eventHref } from '@/features/events/utils/slug';
import { formatDateShort } from '@/features/events/utils/event-formatters';
import styles from './elements.module.scss';

export function EventGrid({ events, className }: { events: ResolvedRailEvent[]; className: string }) {
  return (
    <ul className={`${styles.eventGrid} ${className}`}>
      {events.map((e) => (
        <li key={e.id}>
          <a href={eventHref(e)} className={styles.eventCard}>
            <span className={styles.poster}>
              {/* eslint-disable-next-line @next/next/no-img-element -- poster hosts are not in next/image remotePatterns */}
              {e.posterUrl && <img src={e.posterUrl} alt="" />}
              {e.isLive && <span className={styles.liveBadge}>AO VIVO</span>}
            </span>
            <b>{e.title}</b>
            {e.startsAt && <span className={styles.eventDate}>{formatDateShort(e.startsAt)}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Editor only: the shape of the cards while their data is on its way. */
export function EventSkeleton({ count, className }: { count: number; className: string }) {
  return (
    <ul className={`${styles.eventGrid} ${className}`} aria-busy="true" data-testid="event-skeleton">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}><span className={styles.skelPoster} /><span className={styles.skelLine} /></li>
      ))}
    </ul>
  );
}

/** Editor only: why a data widget shows nothing here, and what the published page does about it. */
export function Notice({ title, text, tone = 'muted' }: { title: string; text: string; tone?: 'muted' | 'error' }) {
  return (
    <div className={`${styles.notice} ${tone === 'error' ? styles.noticeError : ''}`} role="status">
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}

export const Placeholder = ({ children }: { children: string }) => <div className={styles.placeholder}>{children}</div>;
