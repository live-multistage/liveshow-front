// Full-width v2 hero for the editorial home. Client carousel: autoplay,
// dot navigation, keyboard, swipe. A single slide renders as the original
// static hero (no carousel chrome) — extracted from EditorialHome for
// testability.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  FocusEvent as ReactFocusEvent,
} from 'react';
import Link from 'next/link';
import type { Show } from '@/features/events/types/show';
import { SmartImage } from './SmartImage';
import { fmtPrice, playHref, infoHref } from './editorial-parts';
import styles from '../EditorialHomeContent.module.scss';

interface Props {
  slides: Show[];
  localeCode: string;
}

const AUTOPLAY_MS = 7000;
const TEASER_PLAYING_MS = 35000;
const TEASER_FALLBACK_MS = 15000;
const SWIPE_THRESHOLD = 50;

type VideoPhase = 'poster' | 'playing' | 'fallback';

// Poster image with an optional teaser video layered on top. Renders on both
// the single-slide hero and each slide of the multi-slide track, so the
// play/pause-keyed-to-`active` and poster/video swap logic lives in one place.
function HeroSlideMedia({
  show,
  active,
  reducedMotion,
  onPhaseChange,
}: {
  show: Show;
  active: boolean;
  // null = not yet resolved (SSR / pre-effect). Only an explicit `false`
  // clears the video to mount — null and true both suppress it, so a
  // reduced-motion user never gets a video in the SSR/first-render markup.
  reducedMotion: boolean | null;
  onPhaseChange?: (id: string, phase: VideoPhase) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<VideoPhase>('poster');
  const teaserUrl = show.teaserVideoUrl;
  const showVideo = reducedMotion === false && !!teaserUrl && phase !== 'fallback';

  // Report this slide's phase to the parent, which drives the auto-advance
  // dwell. No teaser (or motion-safe suppression) always reads as 'poster' —
  // the default dwell — regardless of `phase`'s (unused) internal value.
  // 'fallback' must still be reported even though the <video> itself is
  // hidden once errored (that's a rendering concern, not a timing one).
  const reportedPhase: VideoPhase = reducedMotion === false && teaserUrl ? phase : 'poster';
  useEffect(() => {
    onPhaseChange?.(show.id, reportedPhase);
  }, [show.id, reportedPhase, onPhaseChange]);

  // Keyed strictly off `active`: an off-screen slide must not keep playing.
  // Restart from the poster every time this slide becomes active again.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !teaserUrl || reducedMotion !== false) return undefined;

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
  }, [active, teaserUrl, reducedMotion]);

  const handleReady = () => setPhase((p) => (p === 'fallback' ? p : 'playing'));
  const handleError = () => {
    // Silent fallback per product spec — no retry, no user-facing error UI,
    // and no console noise (would read as a spec violation in prod logs).
    setPhase('fallback');
  };

  return (
    <>
      <SmartImage src={show.image} alt={show.title} className={styles.heroV2Image} />
      {showVideo && teaserUrl && (
        <video
          ref={videoRef}
          src={teaserUrl}
          muted
          loop
          playsInline
          autoPlay={active}
          preload={active ? 'metadata' : 'none'}
          className={phase === 'playing' ? `${styles.heroV2Video} ${styles.heroV2VideoVisible}` : styles.heroV2Video}
          onLoadedData={handleReady}
          onCanPlay={handleReady}
          onPlaying={handleReady}
          onError={handleError}
        />
      )}
    </>
  );
}

function SlideContent({ show }: { show: Show }) {
  const priceLabel = fmtPrice(show);
  const isFree = priceLabel === 'Grátis';

  return (
    <div className={styles.heroV2Content}>
      {show.isLive && (
        <span className={styles.heroV2Badge}>
          <span className={styles.heroV2BadgeDot} aria-hidden="true" />
          AO VIVO
        </span>
      )}

      <h1 className={styles.heroV2Title}>{show.title}</h1>

      {show.viewers != null && (
        <div className={styles.heroV2Watching}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M4 12a8 8 0 0 1 16 0" />
            <path d="M7 12a5 5 0 0 1 10 0" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          </svg>
          <span className={styles.heroV2WatchingCount}>{show.viewers.toLocaleString('pt-BR')}</span>
          {' '}assistindo agora
        </div>
      )}

      <div className={styles.heroV2Meta}>
        <span>{show.venue}</span>
        <span className={styles.heroV2MetaDot} aria-hidden="true" />
        <span>{show.city}</span>
        <span className={styles.heroV2MetaDot} aria-hidden="true" />
        <span>{show.cameras.length} câmeras</span>
      </div>

      <div className={styles.heroV2Actions}>
        {show.isLive ? (
          <>
            <Link href={playHref(show)} className={styles.heroV2PrimaryBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Assistir agora
            </Link>
            <Link href={infoHref(show)} className={styles.heroV2SecondaryBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              Detalhes
            </Link>
          </>
        ) : (
          <Link href={infoHref(show)} className={styles.heroV2PrimaryBtn}>
            {isFree ? 'Explorar evento' : `Ingressos · ${priceLabel}`}
          </Link>
        )}
      </div>
    </div>
  );
}

export function EditorialHero({ slides }: Props) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // null = not yet resolved. Server-rendered markup (and the first client
  // render, before this effect runs) must not assume motion is safe.
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [videoPhaseById, setVideoPhaseById] = useState<Record<string, VideoPhase>>({});
  const draggedRef = useRef(false);
  const dragStartXRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  const goTo = useCallback((i: number) => {
    setIndex(((i % count) + count) % count);
  }, [count]);

  const handleSlidePhaseChange = useCallback((id: string, phase: VideoPhase) => {
    setVideoPhaseById((prev) => (prev[id] === phase ? prev : { ...prev, [id]: phase }));
  }, []);

  // Auto-advance dwell time is per-active-slide: default for plain image
  // slides, longer while a teaser is actively playing, a shorter middle
  // ground if the teaser failed and fell back to its poster.
  const activeSlide = slides[index];
  const hasActiveTeaser = reducedMotion === false && !!activeSlide?.teaserVideoUrl;
  const activePhase = activeSlide ? (videoPhaseById[activeSlide.id] ?? 'poster') : 'poster';
  const intervalMs = !hasActiveTeaser
    ? AUTOPLAY_MS
    : activePhase === 'playing'
      ? TEASER_PLAYING_MS
      : activePhase === 'fallback'
        ? TEASER_FALLBACK_MS
        : AUTOPLAY_MS;

  useEffect(() => {
    if (count <= 1 || reducedMotion || paused) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [count, reducedMotion, paused, index, intervalMs]);

  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className={styles.heroV2}>
        <HeroSlideMedia show={slides[0]} active reducedMotion={reducedMotion} />
        <div className={styles.heroV2Glow} aria-hidden="true" />
        <div className={styles.heroV2Scrim} aria-hidden="true" />
        <SlideContent show={slides[0]} />
      </div>
    );
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggedRef.current = false;
    dragStartXRef.current = e.clientX;
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (Math.abs(e.clientX - dragStartXRef.current) > SWIPE_THRESHOLD) {
      draggedRef.current = true;
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const delta = e.clientX - dragStartXRef.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) goTo(index + (delta < 0 ? 1 : -1));
  };

  // A swipe that ends over a CTA link must not trigger navigation.
  const handleClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
  };

  const handleBlur = (e: ReactFocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
  };

  return (
    <div
      className={styles.heroV2}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClickCapture={handleClickCapture}
    >
      <div
        className={styles.heroV2Track}
        style={{
          transform: `translateX(-${index * 100}%)`,
          transition: reducedMotion ? 'none' : 'transform 450ms ease',
        }}
      >
        {slides.map((show, i) => (
          <div key={show.id} className={styles.heroV2Slide}>
            <HeroSlideMedia
              show={show}
              active={i === index}
              reducedMotion={reducedMotion}
              onPhaseChange={handleSlidePhaseChange}
            />
            <div className={styles.heroV2Glow} aria-hidden="true" />
            <div className={styles.heroV2Scrim} aria-hidden="true" />
            <SlideContent show={show} />
          </div>
        ))}
      </div>

      <div aria-live="polite" className={styles.visuallyHidden}>
        {slides[index].title}
      </div>

      <div className={styles.heroV2Dots}>
        {slides.map((show, i) => (
          <button
            key={show.id}
            type="button"
            className={i === index ? styles.heroV2DotActive : styles.heroV2Dot}
            aria-label={`Ir para o slide ${i + 1} de ${count}`}
            aria-current={i === index}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
