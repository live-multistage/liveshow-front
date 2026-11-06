import type { FeaturedProps, PublicPage } from '@live-show/api-contracts';
import { eventHref } from '@/features/events/utils/slug';
import { formatDateShort } from '@/features/events/utils/event-formatters';
import styles from './sections.module.scss';

interface Props {
  sectionId: string;
  props: FeaturedProps;
  resolved: PublicPage['resolved'];
}

export function FeaturedSection({ sectionId, props: p, resolved }: Props) {
  const e = resolved.featured[sectionId];
  if (!e) return null;
  return (
    <div className={styles.featured}>
      <span className={styles.featuredArt}>
        {/* eslint-disable-next-line @next/next/no-img-element -- poster hosts are not in next/image remotePatterns */}
        {e.posterUrl && <img src={e.posterUrl} alt="" />}
      </span>
      <div className={styles.featuredBody}>
        {e.startsAt && <span className={styles.eventDate}>{formatDateShort(e.startsAt)}</span>}
        {e.isLive && <span className={styles.liveBadge}>AO VIVO</span>}
        <h2 className={styles.title}>{e.title}</h2>
        <a href={eventHref(e)} className={`${styles.cta} ${styles.ctaPrimary}`}>{p.ctaLabel || 'Comprar ingresso'}</a>
      </div>
    </div>
  );
}
