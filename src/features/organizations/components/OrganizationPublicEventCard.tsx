'use client';

import { Calendar, Clock, MapPin, Radio } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { EventResponse } from '@/features/events/types/event.types';
import { EVENT_TIME_ZONE } from '@/features/events/utils/event-adapter';
import { eventHref } from '@/features/events/utils/slug';
import { WishlistButton } from '@/features/wishlist/components/WishlistButton';
import { useTrackImpression } from '@/features/events/hooks/use-track-impression';
import { useAnalytics } from '@/lib/analytics/tracking';
import styles from './OrganizationPublicEventCard.module.scss';

const LOCALE_CODE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

interface Props {
  event: EventResponse;
  list?: string;
  position?: number;
}

export function OrganizationPublicEventCard({ event, list, position }: Props) {
  const t = useTranslations('orgEventCard');
  const locale = useLocale();
  const localeCode = LOCALE_CODE[locale] ?? 'pt-BR';
  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';
  const impressionRef = useTrackImpression<HTMLAnchorElement>(event.id, list, position);
  const analytics = useAnalytics();
  const handleClick = () => {
    if (!list) return;
    analytics.track('event_clicked', { eventId: event.id, list, position });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(localeCode, { day: '2-digit', month: 'short', year: 'numeric', timeZone: EVENT_TIME_ZONE });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit', timeZone: EVENT_TIME_ZONE });

  return (
    <Link
      ref={impressionRef}
      href={eventHref(event)}
      onClick={handleClick}
      className={`${styles.card} ${isFinished ? styles.cardFinished : ''}`}
    >
      <div className={styles.thumb}>
        {event.thumbnailUrl || event.bannerUrl ? (
          <Image
            src={(event.thumbnailUrl ?? event.bannerUrl) as string}
            alt={event.title}
            fill
            sizes="100px"
            className={styles.thumbImg}
          />
        ) : (
          <div className={styles.thumbPlaceholder} />
        )}
        {isLive && (
          <span className={styles.liveBadge}>
            <Radio size={10} />
            {t('live')}
          </span>
        )}
        {isFinished && <span className={styles.finishedBadge}>{t('finished')}</span>}
        <WishlistButton eventId={event.id} variant="overlay" className={styles.wishlistButton} />
      </div>

      <div className={styles.info}>
        <h3 className={styles.title}>{event.title}</h3>
        {event.description && (
          <p className={styles.description}>{event.description}</p>
        )}
        <div className={styles.meta}>
          {(event.venue || event.city) && (
            <span className={styles.metaItem}>
              <MapPin size={12} />
              {[event.venue, event.city].filter(Boolean).join(' · ')}
            </span>
          )}
          <span className={styles.metaItem}>
            <Calendar size={12} />
            {formatDate(event.startsAt)}
          </span>
          <span className={styles.metaItem}>
            <Clock size={12} />
            {formatTime(event.startsAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
