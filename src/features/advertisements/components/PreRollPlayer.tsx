'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './PreRollPlayer.module.scss';
import { advertisementsService } from '../services/advertisements.service';
import type { ServedAd } from '../types/advertisement.types';

const SKIP_AFTER_MS = 5000;
const PLAYING_WATCHDOG_MS = 8000;

interface Props {
  ad: ServedAd;
  onFinished: () => void;
}

export function PreRollPlayer({ ad, onFinished }: Props) {
  const [skippable, setSkippable] = useState(false);
  const [mutedFallback, setMutedFallback] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(ad.videoDurationSec);
  const impressionFired = useRef(false);
  const finished = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onFinished();
  };

  const watchdogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePlaying = () => {
    if (watchdogTimer.current) {
      clearTimeout(watchdogTimer.current);
      watchdogTimer.current = null;
    }
    if (impressionFired.current) return;
    impressionFired.current = true;
    advertisementsService.recordImpression(ad.servedId);
    skipTimer.current = setTimeout(() => setSkippable(true), SKIP_AFTER_MS);
  };

  // Clears the skip-reveal timer on unmount so it doesn't fire setState after
  // the player is gone (e.g. viewer navigates away mid pre-roll).
  useEffect(() => {
    return () => {
      if (skipTimer.current) clearTimeout(skipTimer.current);
    };
  }, []);

  // Watchdog: if the media connects but never fires 'playing' (stalls before
  // first frame), no 'error' event fires either — skip never arms and the
  // viewer is stuck on a black frame forever. Force-finish after a timeout.
  useEffect(() => {
    watchdogTimer.current = setTimeout(() => finish(), PLAYING_WATCHDOG_MS);
    return () => {
      if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    setRemaining(Math.max(0, Math.ceil(video.duration - video.currentTime)));
  };

  // Unmuted autoplay gets rejected by Chrome/Safari without a user gesture —
  // retry muted (browsers always allow muted autoplay) before giving up.
  // Mirrors playBestEffort in use-hls-player.ts, but a failed muted retry
  // here means the ad genuinely can't play, so it finishes instead of
  // swallowing the error.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      video.muted = true;
      video
        .play()
        .then(() => setMutedFallback(true))
        .catch(() => finish());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const href =
    ad.destination?.type === 'EVENT'
      ? `/events/${ad.destination.eventId}`
      : ad.destination?.type === 'EXTERNAL_URL'
        ? ad.destination.url
        : null;

  return (
    <div className={styles.container}>
      <video
        ref={videoRef}
        data-testid="preroll-video"
        className={styles.video}
        src={ad.videoUrl ?? undefined}
        playsInline
        onPlaying={handlePlaying}
        onTimeUpdate={handleTimeUpdate}
        onEnded={finish}
        onError={finish}
      />
      <div className={styles.overlay}>
        <span className={styles.badge}>
          Anúncio{remaining !== null ? ` · ${remaining}s` : ''}
        </span>
        {mutedFallback && (
          <button
            type="button"
            className={styles.unmute}
            onClick={() => {
              const video = videoRef.current;
              if (video) video.muted = false;
              setMutedFallback(false);
            }}
          >
            Ativar som
          </button>
        )}
        {href && (
          <a
            className={styles.cta}
            href={href}
            target={ad.destination?.type === 'EXTERNAL_URL' ? '_blank' : undefined}
            rel="noreferrer"
            onClick={() => advertisementsService.recordClick(ad.servedId)}
          >
            {ad.title}
          </a>
        )}
        {skippable && (
          <button type="button" className={styles.skip} onClick={finish}>
            Pular anúncio
          </button>
        )}
      </div>
    </div>
  );
}
