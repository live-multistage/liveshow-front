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

export function ScrollExpandMedia({ media, overlay, hint, background, className }: ScrollExpandMediaProps) {
  // Always start collapsed so server and client markup match; the
  // environment check (reduced motion) runs in the effect below.
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
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

  // Scroll-driven, not scroll-hijacking: progress is derived from where the
  // (tall) section sits relative to the viewport as the user scrolls the
  // page normally. No preventDefault, no scrollTo, no wheel/touch capture —
  // native scrolling, keyboard, and anchor links all just work.
  useEffect(() => {
    if (prefersReducedMotion()) {
      setReducedMotion(true);
      setProgress(1);
      return undefined;
    }

    let ticking = false;

    const computeProgress = () => {
      ticking = false;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const scrollRange = rect.height - window.innerHeight;
      if (scrollRange <= 0) {
        setProgress(1);
        return;
      }
      const next = -rect.top / scrollRange;
      setProgress(Math.min(Math.max(next, 0), 1));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(computeProgress);
    };

    computeProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const expanded = reducedMotion || progress >= 1;

  const expand = () => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  return (
    <section
      ref={sectionRef}
      className={[styles.section, reducedMotion ? styles.reducedMotion : '', className ?? ''].join(' ').trim()}
      style={{ '--p': progress, ...(mediaTop !== null ? { '--media-top': `${mediaTop}px` } : {}) } as never}
      data-expanded={expanded}
    >
      <div className={styles.sticky}>
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
          {hint && progress < 0.2 ? (
            <p className={styles.hint} style={{ opacity: 1 - progress }}>
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
