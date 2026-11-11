import type { RailProps, PublicPage } from '@live-show/api-contracts';
import { eventHref } from '@/features/events/utils/slug';
import { formatDateShort } from '@/features/events/utils/event-formatters';
import styles from './sections.module.scss';

interface Props {
  sectionId: string;
  props: RailProps;
  resolved: PublicPage['resolved'];
}

// PageSections skips the whole frame when there are no events; the guard keeps the component safe standalone.
export function RailSection({ sectionId, props: p, resolved }: Props) {
  const events = resolved.rails[sectionId] ?? [];
  if (events.length === 0) return null;
  return (
    <>
      <h2 className={styles.title}>{p.title}</h2>
      <ul className={styles.rail}>
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
    </>
  );
}
