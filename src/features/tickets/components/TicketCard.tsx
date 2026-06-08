'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Tv2, RotateCcw, MapPin } from 'lucide-react';
import type { PurchasedTicket } from '../types/ticket.types';
import { formatDate, formatTime } from '@/features/events';
import styles from './TicketCard.module.scss';

interface TicketCardProps {
  ticket: PurchasedTicket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const { event, capabilities, ticketProductName } = ticket;
  const router = useRouter();

  const isLive = event.status === 'LIVE';
  const hasReplay = capabilities.includes('REPLAY_VIEW');
  const location = [event.venue, event.city].filter(Boolean).join(' · ');

  return (
    <div className={styles.card}>
      <div className={styles.inner}>
        <div className={styles.thumbnail}>
          {(event.thumbnailUrl ?? event.bannerUrl) ? (
            <img
              src={(event.thumbnailUrl ?? event.bannerUrl)!}
              alt={event.title}
              className={styles.thumbnailImg}
            />
          ) : (
            <div className={styles.thumbnailPlaceholder} />
          )}
          <div className={styles.thumbnailOverlay} />
          {isLive && (
            <div className={styles.liveBadge}>
              <span className={styles.liveDot} />
              LIVE
            </div>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.info}>
            <div className={styles.badgeRow}>
              <span className={styles.badgeActive}>✓ INGRESSO ATIVO</span>
              {hasReplay ? (
                <span className={styles.badgeReplay}>
                  <RotateCcw size={10} />
                  COM REPRISE
                </span>
              ) : (
                <span className={styles.badgeLiveOnly}>📺 APENAS AO VIVO</span>
              )}
              <span className={styles.badgeGenre}>{ticketProductName}</span>
            </div>

            <h3 className={styles.cardTitle}>{event.title}</h3>

            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <Calendar size={12} />
                {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
              </span>
              {location && (
                <span className={styles.metaItem}>
                  <MapPin size={12} />
                  {location}
                </span>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              onClick={() => router.push(`/events/${event.id}`)}
              className={styles.btnDetails}
            >
              Detalhes
            </button>

            {hasReplay && (
              <button
                onClick={() => router.push(`/replay/${event.id}`)}
                className={styles.btnReplay}
              >
                <RotateCcw size={13} />
                Reprise
              </button>
            )}

            <button
              onClick={() => router.push(`/live/${event.id}`)}
              className={styles.btnWatch}
            >
              <Tv2 size={15} />
              Assistir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
