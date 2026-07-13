'use client';

import { Calendar, Clock, MapPin, Radio } from 'lucide-react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import type { EventResponse } from '@/features/events/types/event.types';
import styles from './OrganizationPublicEventCard.module.scss';

const LOCALE_CODE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

interface Props {
  event: EventResponse;
}

export function OrganizationPublicEventCard({ event }: Props) {
  const t = useTranslations('orgEventCard');
  const locale = useLocale();
  const localeCode = LOCALE_CODE[locale] ?? 'pt-BR';
  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(localeCode, { day: '2-digit', month: 'short', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit' });

  return (
    <Link
      href={`/events/${event.id}`}
      className={`${styles.card} ${isFinished ? styles.cardFinished : ''}`}
    >
      <div className={styles.thumb}>
        {event.thumbnailUrl || event.bannerUrl ? (
          <img
            src={(event.thumbnailUrl ?? event.bannerUrl) as string}
            alt={event.title}
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
