'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, Calendar, Video } from 'lucide-react';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useGetEventQuery } from '@/features/events/queries/get-event';
import { useWishlistIdsQuery, useToggleWishlistMutation } from '@/features/wishlist';
import styles from './LiveNotStarted.module.scss';

interface Props {
  eventId: string;
  eventTitle?: string;
  cameraCount: number;
  onExit: () => void;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Ticks every second from `target`; null once the target is unknown or already past. */
function useCountdown(target: string | null | undefined) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!target) {
      setRemainingMs(null);
      return;
    }
    const targetMs = new Date(target).getTime();
    if (Number.isNaN(targetMs)) {
      setRemainingMs(null);
      return;
    }

    const tick = () => setRemainingMs(targetMs - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (remainingMs === null || remainingMs <= 0) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function formatStartLabel(startsAt: string): string {
  const date = new Date(startsAt);
  const now = new Date();
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return `HOJE · ${time}`;
  return `${WEEKDAYS[date.getDay()]}, ${pad2(date.getDate())} ${MONTHS[date.getMonth()]} · ${time}`;
}

export function LiveNotStarted({ eventId, eventTitle, cameraCount, onExit }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const event = useGetEventQuery(eventId);
  const countdown = useCountdown(event.data?.startsAt);

  const { data: wishlistIds } = useWishlistIdsQuery({ enabled: isLoggedIn });
  const toggleWishlist = useToggleWishlistMutation();
  const remindMeSaved = wishlistIds?.includes(eventId) ?? false;

  const title = event.data?.title ?? eventTitle;
  const orgName = event.data?.organization?.name;
  const slug = event.data?.slug ?? eventId;

  const handleRemindMe = () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    toggleWishlist.mutate({ eventId, saved: remindMeSaved });
  };

  return (
    <div className={styles.root}>
      <div className={styles.glowPink} aria-hidden="true" />
      <div className={styles.glowPurple} aria-hidden="true" />

      {/* Top bar — echoes the player Header, AGUARDANDO variant */}
      <header className={styles.header}>
        <button onClick={onExit} className={styles.backBtn} aria-label="Voltar" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className={styles.titleGroup}>
          <span className={styles.waitingBadge}>
            <span className={styles.waitingDot} />
            AGUARDANDO
          </span>
          <div>
            {title && <div className={styles.headerTitle}>{title}</div>}
            {orgName && <div className={styles.headerMeta}>{orgName.toUpperCase()}</div>}
          </div>
        </div>
      </header>

      {/* Stage */}
      <main className={styles.main}>
        {event.data?.bannerUrl && (
          // ponytail: plain img — this is a decorative blurred backdrop, not
          // a content image; next/image's contract adds nothing here.
          <img src={event.data.bannerUrl} alt="" className={styles.backdrop} aria-hidden="true" />
        )}
        <div className={styles.scrim} aria-hidden="true" />
        {orgName && (
          <div className={styles.watermark} aria-hidden="true">
            {orgName}
          </div>
        )}

        <div className={styles.content}>
          <div className={styles.eq} aria-hidden="true">
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
            <div className={styles.eqBar} />
          </div>

          {countdown ? (
            <>
              <div className={styles.eyebrow}>A TRANSMISSÃO COMEÇA EM</div>
              <div className={styles.countdown}>{countdown}</div>
            </>
          ) : (
            <div className={styles.eyebrow}>AGUARDANDO O INÍCIO DA TRANSMISSÃO</div>
          )}

          {title && <h1 className={styles.title}>{title}</h1>}

          <div className={styles.metaRow}>
            {event.data?.startsAt && (
              <span className={styles.metaItem}>
                <Calendar size={13} />
                {formatStartLabel(event.data.startsAt)}
              </span>
            )}
            <span className={styles.metaItem}>
              <Video size={13} />
              {cameraCount} {cameraCount === 1 ? 'câmera' : 'câmeras'}
            </span>
          </div>

          <div className={styles.autoRefresh}>
            Esta página entra ao vivo sozinha — não precisa recarregar
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.remindBtn}
              onClick={handleRemindMe}
              disabled={toggleWishlist.isPending}
            >
              <Bell size={14} fill={remindMeSaved ? 'currentColor' : 'none'} />
              {remindMeSaved ? 'Você será avisado' : 'Avisar quando começar'}
            </button>
            <Link href={`/events/${slug}`} className={styles.scheduleBtn}>
              Ver programação
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom transport bar — disabled echo of the live player's controls */}
      <footer className={styles.transport}>
        <button type="button" className={styles.playBtn} disabled aria-label="Reproduzir">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <span className={styles.time}>--:--</span>
        <div className={styles.progressTrack} aria-hidden="true" />
        <span className={styles.time}>--:--</span>
      </footer>
    </div>
  );
}
