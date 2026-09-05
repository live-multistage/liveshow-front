'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import styles from './ScrollExpandMedia.module.scss';

interface ScrollExpandMediaOverlayState {
  progress: number;
  expanded: boolean;
  expand: () => void;
}

interface ScrollExpandMediaProps {
  media: ReactNode;
  overlay: (state: ScrollExpandMediaOverlayState) => ReactNode;
  hint?: string;
  background?: ReactNode;
  className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Should the hero start already expanded instead of hijacking scroll?
// True on a mid-page refresh, an anchor-link landing, or reduced motion —
// none of those should trap the user behind the wheel/touch handlers below.
function shouldStartExpanded(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.scrollY > 5) return true;
  if (window.location.hash) return true;
  return prefersReducedMotion();
}

export function ScrollExpandMedia({ media, overlay, hint, background, className }: ScrollExpandMediaProps) {
  // Always start collapsed so server and client markup match; the
  // environment checks run in the effect below.
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Mirrored in refs so the listeners can be registered once (mount) and
  // still read the latest values, instead of re-binding on every frame.
  const progressRef = useRef(progress);
  const expandedRef = useRef(expanded);
  const touchStartYRef = useRef(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  // Collapsed media sits right under the overlay text, whatever its height.
  const [mediaTop, setMediaTop] = useState<number | null>(null);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => setMediaTop(el.offsetTop + el.offsetHeight + 40);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Direct setState: React batches per event, and wheel/touch events are
  // already frame-paced by the browser. rAF would stall in hidden tabs.
  const flush = () => {
    setProgress(progressRef.current);
    setExpanded(expandedRef.current);
  };

  const expand = () => {
    progressRef.current = 1;
    expandedRef.current = true;
    flush();
  };

  useEffect(() => {
    if (shouldStartExpanded()) {
      expand();
      return undefined;
    }

    const setProgressClamped = (next: number) => {
      progressRef.current = Math.min(Math.max(next, 0), 1);
      if (progressRef.current >= 1) expandedRef.current = true;
      flush();
    };

    const onWheel = (event: WheelEvent) => {
      if (expandedRef.current && event.deltaY < 0 && window.scrollY <= 5) {
        expandedRef.current = false;
        event.preventDefault();
        flush();
        return;
      }
      if (expandedRef.current) return;
      event.preventDefault();
      setProgressClamped(progressRef.current + event.deltaY * 0.0009);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchStartYRef.current) return;
      const touchY = event.touches[0]?.clientY ?? touchStartYRef.current;
      const deltaY = touchStartYRef.current - touchY;

      if (expandedRef.current && deltaY < -20 && window.scrollY <= 5) {
        expandedRef.current = false;
        event.preventDefault();
        flush();
        return;
      }
      if (expandedRef.current) return;

      event.preventDefault();
      const scrollFactor = deltaY < 0 ? 0.008 : 0.005;
      setProgressClamped(progressRef.current + deltaY * scrollFactor);
      touchStartYRef.current = touchY;
    };

    const onTouchEnd = () => {
      touchStartYRef.current = 0;
    };

    const onScroll = () => {
      if (!expandedRef.current) window.scrollTo(0, 0);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className={[styles.section, className ?? ''].join(' ').trim()}
      style={{ '--p': progress, ...(mediaTop !== null ? { '--media-top': `${mediaTop}px` } : {}) } as never}
      data-expanded={expanded}
    >
      {background ? (
        <motion.div
          className={styles.background}
          initial={{ opacity: 1 - progress }}
          animate={{ opacity: 1 - progress }}
          transition={{ duration: 0.1 }}
        >
          {background}
        </motion.div>
      ) : null}

      <div ref={overlayRef} className={styles.overlay}>
        {overlay({ progress, expanded, expand })}
      </div>

      <div className={styles.mediaWrap}>
        <div className={styles.mediaInner}>
          {media}
          <motion.div
            className={styles.scrim}
            initial={{ opacity: 0.5 - progress * 0.3 }}
            animate={{ opacity: 0.5 - progress * 0.3 }}
            transition={{ duration: 0.2 }}
          />
        </div>
        {hint ? (
          <p className={styles.hint} style={{ opacity: 1 - progress }}>
            {hint}
          </p>
        ) : null}
      </div>
    </section>
  );
}
