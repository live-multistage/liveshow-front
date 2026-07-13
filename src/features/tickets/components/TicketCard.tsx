'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { PurchasedTicket } from '../types/ticket.types';
import { formatDate, formatTime } from '@/features/events';
import styles from './TicketCard.module.scss';

interface TicketCardProps {
  ticket: PurchasedTicket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const t = useTranslations('ticketCard');
  const { event, capabilities, camerasLimit, ticketProductName } = ticket;

  const isLive = event.status === 'LIVE';
  const hasReplay = capabilities.includes('REPLAY_VIEW');
  const hasCameras = capabilities.includes('CAMERA_VIEW');
  const location = [event.venue, event.city].filter(Boolean).join(' · ');

  const cameraLabel = camerasLimit === null
    ? t('allCameras')
    : t('cameras', { count: camerasLimit });

  const watchHref = isLive
    ? `/live/${event.id}`
    : hasReplay
      ? `/replay/${event.id}`
      : null;

  const watchLabel = isLive ? t('watchNow') : hasReplay ? t('watchReplay') : t('watch');
  const coverImage = event.thumbnailUrl ?? event.bannerUrl;

  return (
    <div className={styles.card}>
      <div
        className={styles.cover}
        style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
      >
        {isLive && (
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} />
            LIVE
          </div>
        )}
        <div className={styles.coverScrim} />
      </div>

      <div className={styles.body}>
        <div className={styles.info}>
          <div className={styles.badgeRow}>
            <span className={styles.badgeActive}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t('active')}
            </span>
            {hasReplay && (
              <span className={styles.badgeReplay}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M3 12a9 9 0 1 1 3 6.7M3 21v-5h5" />
                </svg>
                {t('withReplay')}
              </span>
            )}
            {hasCameras && (
              <span className={styles.badgeCamera}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7Z" /><rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                {cameraLabel}
              </span>
            )}
            <span className={styles.ticketType}>{ticketProductName}</span>
          </div>

          <h3 className={styles.title}>{event.title}</h3>

          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
              </svg>
              {formatDate(event.startsAt)} · {formatTime(event.startsAt)}
            </span>
            {location && (
              <span className={styles.metaItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.6" />
                </svg>
                {location}
              </span>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          {watchHref ? (
            <Link className={styles.btnWatch} href={watchHref}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              {watchLabel}
            </Link>
          ) : (
            <button className={styles.btnWatch} disabled>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              {watchLabel}
            </button>
          )}
          <Link className={styles.btnDetails} href={`/events/${event.id}`}>
            {t('details')}
          </Link>
        </div>
      </div>
    </div>
  );
}
