'use client';

import { useEffect, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { useRecommendedEventsQuery } from '@/features/events/queries/use-recommended-events';
import { eventToShow } from '@/features/events/utils/event-adapter';
import { ShowCard } from '@/features/events/components/public/ShowCard';
import { useScrollGesture } from '../hooks/use-scroll-gesture';
import styles from './RecommendedOverlay.module.scss';

interface RecommendedOverlayProps {
  eventId: string;
  // The fullscreen player container — gesture target and visual host.
  containerRef: RefObject<HTMLElement | null>;
  isFullscreen: boolean;
}

// YouTube-fullscreen-style recommended rail. Lives ONLY inside fullscreen:
// outside it the page has its own navigation and the overlay must not exist.
// Opens by chevron or by scrolling/swiping down; closes by chevron, scroll up,
// or leaving fullscreen (Esc unmounts it via isFullscreen).
export function RecommendedOverlay({ eventId, containerRef, isFullscreen }: RecommendedOverlayProps) {
  const t = useTranslations('player');
  const [open, setOpen] = useState(false);

  // Fetch only once someone actually opens the panel — most viewers never do,
  // and the query stays cached (React Query) for reopens.
  const { data } = useRecommendedEventsQuery(undefined, { enabled: open && isFullscreen });

  useEffect(() => {
    if (!isFullscreen) setOpen(false);
  }, [isFullscreen]);

  useScrollGesture(containerRef, {
    enabled: isFullscreen,
    onDown: () => setOpen(true),
    onUp: () => setOpen(false),
  });

  if (!isFullscreen) return null;

  const shows = (data?.items ?? []).map(eventToShow).filter((s) => s.id !== eventId);

  return (
    <div className={styles.overlay} data-open={open}>
      <button
        type="button"
        className={styles.chevron}
        aria-expanded={open}
        aria-label={open ? t('recommendedClose') : t('recommendedOpen')}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          {open ? <path d="M6 9l6 6 6-6" /> : <path d="M6 15l6-6 6 6" />}
        </svg>
        <span className={styles.chevronLabel}>{t('recommendedTitle')}</span>
      </button>

      {open && (
        <div className={styles.panel} role="region" aria-label={t('recommendedTitle')}>
          {shows.length === 0 ? (
            <p className={styles.empty}>{t('recommendedEmpty')}</p>
          ) : (
            <div className={styles.rail}>
              {shows.map((show) => (
                <div key={show.id} className={styles.card}>
                  <ShowCard show={show} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
