'use client';

import { Calendar, Clock, MapPin, Radio } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { EventResponse } from '@/features/events/types/event.types';
import styles from './OrganizationPublicEventCard.module.scss';

interface Props {
  event: EventResponse;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function OrganizationPublicEventCard({ event }: Props) {
  const router = useRouter();
  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';

  return (
    <div
      className={`${styles.card} ${isFinished ? styles.cardFinished : ''}`}
      onClick={() => router.push(`/events/${event.id}`)}
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
            Ao Vivo
          </span>
        )}
        {isFinished && <span className={styles.finishedBadge}>Encerrado</span>}
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
    </div>
  );
}
