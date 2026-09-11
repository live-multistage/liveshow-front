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
import { useTranslations } from 'next-intl';
import type { Show } from '@/features/events/types/show';
import { MediaWithTeaserVideo, type TeaserVideoPhase } from '@/shared/components/MediaWithTeaserVideo';
import { onImgError } from './SmartImage';
import { fmtPrice, playHref, infoHref } from './editorial-parts';
import styles from '../EditorialHomeContent.module.scss';

interface Props {
  slides: Show[];
}

function isFreeShow(show: Show) {
  return show.priceRange
    ? show.priceRange.min === 0 && show.priceRange.max === 0
    : show.price === 0;
}

const AUTOPLAY_MS = 7000;
const TEASER_PLAYING_MS = 35000;
const TEASER_FALLBACK_MS = 15000;
const SWIPE_THRESHOLD = 50;

type VideoPhase = TeaserVideoPhase;

// Thin slide-aware adapter over the shared poster+teaser media component:
// keys the phase report to this slide's id (the carousel tracks phases per
// slide to size its auto-advance dwell) and supplies the hero's classes.
function HeroSlideMedia({
  show,
  active,
  reducedMotion,
  onPhaseChange,
}: {
  show: Show;
  active: boolean;
  // null = not yet resolved (SSR / pre-effect). Resolved once at the
  // EditorialHero level and threaded down, so N slides don't each open their
  // own matchMedia listener.
  reducedMotion: boolean | null;
  onPhaseChange?: (id: string, phase: VideoPhase) => void;
}) {
  const handlePhaseChange = useCallback(
    (phase: VideoPhase) => onPhaseChange?.(show.id, phase),
    [show.id, onPhaseChange],
  );

  return (
    <MediaWithTeaserVideo
      posterSrc={show.image}
      posterAlt={show.title}
      videoSrc={show.teaserVideoUrl}
      active={active}
      reducedMotion={reducedMotion}
      onPhaseChange={onPhaseChange ? handlePhaseChange : undefined}
      posterClassName={styles.heroV2Image}
      videoClassName={styles.heroV2Video}
      videoVisibleClassName={styles.heroV2VideoVisible}
      posterOnError={onImgError}
    />
  );
}

function SlideContent({ show }: { show: Show }) {
  const t = useTranslations('home.hero');
  const tCameras = useTranslations('home');
  const priceLabel = fmtPrice(show);
  const isFree = isFreeShow(show);
  // The slide title is a <p>, not a heading: the page's <h1> is the stable
  // headline rendered once by EditorialHome, so a rotating carousel never
  // changes the document outline and hidden slides never pose as sections.
  return (
    <div className={styles.heroV2Content}>
      {show.isLive && (
        <span className={styles.heroV2Badge}>
          <span className={styles.heroV2BadgeDot} aria-hidden="true" />
          {t('live')}
        </span>
      )}

      <p className={styles.heroV2Title}>{show.title}</p>

      {show.viewers != null && (
        <div className={styles.heroV2Watching}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M4 12a8 8 0 0 1 16 0" />
            <path d="M7 12a5 5 0 0 1 10 0" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          </svg>
          <span className={styles.heroV2WatchingCount}>{t('watching', { count: show.viewers })}</span>
        </div>
      )}

      <div className={styles.heroV2Meta}>
        <span>{show.venue}</span>
        <span className={styles.heroV2MetaDot} aria-hidden="true" />
        <span>{show.city}</span>
        <span className={styles.heroV2MetaDot} aria-hidden="true" />
        <span>{tCameras('cameras', { count: show.cameras.length })}</span>
      </div>

      <div className={styles.heroV2Actions}>
        {show.isLive ? (
          <>
            <Link href={playHref(show)} className={styles.heroV2PrimaryBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              {t('watchNow')}
            </Link>
            <Link href={infoHref(show)} className={styles.heroV2SecondaryBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              {t('details')}
            </Link>
          </>
        ) : (
          <Link href={infoHref(show)} className={styles.heroV2PrimaryBtn}>
            {isFree ? t('exploreEvent') : t('tickets', { price: priceLabel })}
          </Link>
        )}
      </div>
    </div>
  );
}

export function EditorialHero({ slides }: Props) {
  const t = useTranslations('home.hero');
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // null = not yet resolved. Server-rendered markup (and the first client
  // render, before this effect runs) must not assume motion is safe.
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [videoPhaseById, setVideoPhaseById] = useState<Record<string, VideoPhase>>({});
  const draggedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // `inert` is set imperatively rather than as a JSX prop. React 19 (what
  // Next 15 actually ships at runtime) treats `inert` as a real boolean
  // attribute and warns on any non-boolean value ("Received an empty string
  // for a boolean attribute `inert`"); this repo's installed react/@types
  // (18.3, used by tsc and the vitest/jsdom suite) has no such special
  // handling and silently drops a JSX `inert={true}` instead of rendering
  // it. There is no prop value that is simultaneously correct under both
  // runtimes, so `toggleAttribute` bypasses the JSX/React attribute layer
  // entirely and is correct everywhere. `aria-hidden` stays a normal JSX
  // prop below so SSR/pre-hydration markup still marks inactive slides.
  //
  // Applied from the ref callback itself, not a useEffect keyed on
  // [index, count]: `heroSlides` is recomputed on every parent render from
  // live event data, so a show going live/ending can swap the Show at a
  // given index while count and index stay the same. React then mounts a
  // *new* DOM node under the same `key={show.id}` position, which a
  // `[index, count]`-keyed effect never revisits — that node would be
  // missing `inert` until the next navigation. An inline arrow-function ref
  // gets a new identity every render, so React calls it (with the live
  // element) on every render, not just on mount/unmount — it self-heals
  // regardless of whether the DOM node is new or reused, so no separate
  // effect is needed to keep it in sync.

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
          <div
            key={show.id}
            ref={(el) => {
              slideRefs.current[i] = el;
              el?.toggleAttribute('inert', i !== index);
            }}
            className={styles.heroV2Slide}
            aria-hidden={i !== index || undefined}
          >
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
            className={`${styles.heroV2Dot} ${i === index ? styles.heroV2DotActive : ''}`}
            aria-label={t('goToSlide', { index: i + 1, count })}
            aria-current={i === index}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
