'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import type { ChannelListItem, ScheduledSlot } from '../types/channel.types';
import styles from './ChannelCard.module.scss';

interface Props {
  channel: ChannelListItem;
}

function slotTime(slot: ScheduledSlot, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(slot.startsAt));
}

function slotProgress(slot: ScheduledSlot, now: Date): number {
  const start = new Date(slot.startsAt).getTime();
  const end = new Date(slot.endsAt).getTime();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, Math.round(((now.getTime() - start) / (end - start)) * 100)));
}

// Cartão de canal do catálogo público (trilho da home e listagem /channels).
// Forma "TV": bug do canal com waveform sobre a arte, linha AGORA com barra de
// progresso do bloco e A SEGUIR — nunca data nem preço de ingresso.
export function ChannelCard({ channel }: Props) {
  const t = useTranslations('channels');
  const now = new Date();
  const live = channel.isOnAir;
  const progress = live && channel.current ? slotProgress(channel.current, now) : 0;

  return (
    <Link href={`/channels/${channel.slug}`} className={styles.card}>
      <div className={clsx(styles.cover, !live && styles.coverOffline)}>
        {channel.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={channel.coverUrl} alt="" className={styles.coverImage} />
        ) : (
          <div className={styles.coverFallback} aria-hidden="true" />
        )}

        {live ? (
          <span className={styles.onAir}>
            <span className={styles.onAirDot} />
            {t('onAir')}
          </span>
        ) : (
          <span className={styles.offAir}>{t('offAirBadge')}</span>
        )}
        <span className={styles.badge24h}>{t('badge24h')}</span>

        <span className={styles.bug}>
          <span className={styles.bugWave} aria-hidden="true">
            <span className={clsx(styles.bugBar, live && styles.bugBarLive)} />
            <span className={clsx(styles.bugBar, live && styles.bugBarLive)} />
            <span className={clsx(styles.bugBar, live && styles.bugBarLive)} />
          </span>
          <span className={styles.bugLabel}>{channel.name}</span>
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.nameRow}>
          <p className={styles.name}>{channel.name}</p>
          <span
            className={clsx(
              styles.accessPill,
              channel.accessMode === 'FREE' ? styles.accessFree : styles.accessSub,
            )}
          >
            {channel.accessMode === 'FREE' ? t('free') : t('subscriptionBadge')}
          </span>
        </div>

        <div className={styles.schedule}>
          {live && channel.current ? (
            <div className={styles.slotRow}>
              <span className={clsx(styles.slotLabel, styles.slotLabelNow)}>{t('now')}</span>
              <span className={styles.slotNameNow}>{channel.current.name}</span>
            </div>
          ) : channel.next ? (
            <div className={styles.slotRow}>
              <span className={styles.slotLabel}>
                {t('atTime', { time: slotTime(channel.next, channel.timezone) })}
              </span>
              <span className={styles.slotNameNow}>{channel.next.name}</span>
            </div>
          ) : null}

          <div className={styles.progressTrack} aria-hidden="true">
            <div
              className={clsx(styles.progressFill, live && styles.progressFillLive)}
              style={{ width: `${progress}%` }}
              suppressHydrationWarning
            />
          </div>

          {live && channel.next && (
            <div className={styles.slotRow}>
              <span className={styles.slotLabel}>{slotTime(channel.next, channel.timezone)}</span>
              <span className={styles.slotNameNext}>{channel.next.name}</span>
            </div>
          )}
        </div>

        <span className={styles.cta}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          {t('enterLive')}
        </span>
      </div>
    </Link>
  );
}
