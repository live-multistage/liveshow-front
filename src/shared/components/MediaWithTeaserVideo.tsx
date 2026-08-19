'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactEventHandler } from 'react';

export type TeaserVideoPhase = 'poster' | 'playing' | 'fallback';

interface Props {
  posterSrc: string;
  posterAlt: string;
  videoSrc?: string | null;
  /** Carousels pass their per-slide active state; single-instance callers omit it. */
  active?: boolean;
  /**
   * null = not yet resolved (SSR / pre-effect). Only an explicit `false` clears
   * the video to mount — null and true both suppress it, so a reduced-motion
   * user never gets a video in the SSR/first-render markup. Omit entirely to
   * let this component run its own matchMedia check (one listener per
   * instance); pass it down when the caller already tracks it once for N
   * instances.
   */
  reducedMotion?: boolean | null;
  onPhaseChange?: (phase: TeaserVideoPhase) => void;
  posterClassName?: string;
  videoClassName?: string;
  /** Appended to videoClassName once the teaser has buffered enough to show. */
  videoVisibleClassName?: string;
  posterOnError?: ReactEventHandler<HTMLImageElement>;
}

export function MediaWithTeaserVideo({
  posterSrc,
  posterAlt,
  videoSrc,
  active = true,
  reducedMotion,
  onPhaseChange,
  posterClassName,
  videoClassName,
  videoVisibleClassName,
  posterOnError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<TeaserVideoPhase>('poster');

  // Only self-detect when the caller didn't supply the value — a carousel
  // resolves it once at the parent instead of N times here.
  const selfDetect = reducedMotion === undefined;
  const [detected, setDetected] = useState<boolean | null>(null);
  useEffect(() => {
    if (!selfDetect) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setDetected(mql.matches);
    const onChange = () => setDetected(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [selfDetect]);

  const motionBlocked = selfDetect ? detected : reducedMotion;
  const showVideo = motionBlocked === false && !!videoSrc && phase !== 'fallback';

  // No teaser (or motion-safe suppression) always reads as 'poster' regardless
  // of `phase`'s (unused) internal value. 'fallback' must still be reported
  // even though the <video> itself is unmounted once errored (that's a
  // rendering concern, not a timing one).
  const reportedPhase: TeaserVideoPhase = motionBlocked === false && videoSrc ? phase : 'poster';
  useEffect(() => {
    onPhaseChange?.(reportedPhase);
  }, [reportedPhase, onPhaseChange]);

  // Keyed strictly off `active`: an off-screen instance must not keep playing.
  // Restart from the poster every time it becomes active again.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc || motionBlocked !== false) return undefined;

    if (active) {
      setPhase((p) => (p === 'fallback' ? p : 'poster'));
      try {
        const playResult = video.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }
      } catch {
        // Autoplay can be blocked, or unsupported in some environments —
        // the poster stays visible either way, so nothing else to do.
      }
    } else {
      video.pause();
      video.currentTime = 0;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, videoSrc, motionBlocked]);

  const handleReady = () => setPhase((p) => (p === 'fallback' ? p : 'playing'));
  const handleError = () => {
    // Silent fallback per product spec — no retry, no user-facing error UI,
    // and no console noise (would read as a spec violation in prod logs).
    setPhase('fallback');
  };

  const visibleClass = videoVisibleClassName && phase === 'playing'
    ? `${videoClassName ?? ''} ${videoVisibleClassName}`.trim()
    : videoClassName;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={posterSrc} alt={posterAlt} className={posterClassName} onError={posterOnError} />
      {showVideo && videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          loop
          playsInline
          autoPlay={active}
          preload={active ? 'metadata' : 'none'}
          className={visibleClass}
          onLoadedData={handleReady}
          onCanPlay={handleReady}
          onPlaying={handleReady}
          onError={handleError}
        />
      )}
    </>
  );
}
