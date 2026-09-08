'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@live-show/design-system';
import { useListEventsQuery } from '../../queries/use-list-events';
import { eventHref } from '../../utils/slug';
import { formatDateShort } from '../../utils/event-formatters';
import type { EventResponse } from '../../types/event.types';
import styles from './RelatedEvents.module.scss';

const MAX_RELATED = 6;

interface Props {
  currentEventId: string;
  organizationId?: string;
}

// ponytail: reuses the same "all events" list the /events catalog page already
// fetches (react-query dedupes/caches it) instead of a dedicated
// recommendations endpoint. Same-org events are ranked first for relevance.
export function RelatedEvents({ currentEventId, organizationId }: Props) {
  const t = useTranslations('events.detail.related');
  const { data: events, isLoading } = useListEventsQuery('all');

  if (isLoading) {
    return (
      <section className={styles.section}>
        <h2 className={styles.heading}>{t('title')}</h2>
        <div className={styles.grid}>
          {Array.from({ length: MAX_RELATED }).map((_, i) => (
            <div key={i} className={styles.card}>
              <Skeleton className={styles.skeletonThumb} />
              <Skeleton className={styles.skeletonTitle} />
              <Skeleton className={styles.skeletonDate} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!events) return null;

  const related = events
    .filter((event) => event.id !== currentEventId)
    .sort((a, b) => Number(b.organizationId === organizationId) - Number(a.organizationId === organizationId))
    .slice(0, MAX_RELATED);

  if (related.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{t('title')}</h2>
      <div className={styles.grid}>
        {related.map((event) => (
          <RelatedEventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

function RelatedEventCard({ event }: { event: EventResponse }) {
  const image = event.thumbnailUrl ?? event.bannerUrl;

  return (
    <Link href={eventHref(event)} className={styles.card}>
      <div className={styles.thumbWrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element -- thumbnailUrl/bannerUrl
            host varies per event (arbitrary CDN), can't be statically allow-listed
            in next.config images.remotePatterns; mirrors the hero image's own choice
            in EventDetailPageContent (MediaWithTeaserVideo). */}
        {image && <img src={image} alt={event.title} className={styles.thumb} />}
      </div>
      <span className={styles.cardTitle}>{event.title}</span>
      <span className={styles.cardDate}>{formatDateShort(event.startsAt)}</span>
    </Link>
  );
}
