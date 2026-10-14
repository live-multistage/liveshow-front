'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { chapterAt } from '@live-show/api-contracts';
import type { ReplayChapter, ReplayEventTimeline } from '../../types/live.types';
import { chapterDuration, chapterProgressPct, formatClock } from '../../utils/chapter-track';
import styles from './ChaptersDrawer.module.scss';

interface Props {
  open: boolean;
  // visibleChapters() output for the stage on screen.
  chapters: ReplayChapter[];
  positionMs: number;
  timeline: ReplayEventTimeline;
  // Stage id → name when the event has more than one stage; null hides the tags.
  stageNames: Record<string, string> | null;
  onSeek: (absoluteMs: number) => void;
  onClose: () => void;
}

// Right drawer (bottom sheet ≤820px) listing the replay's chapters. Picking
// one seeks and leaves the drawer open so the viewer can keep browsing.
export function ChaptersDrawer({ open, chapters, positionMs, timeline, stageNames, onSeek, onClose }: Props) {
  const t = useTranslations('player');
  const currentRef = useRef<HTMLLIElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const current = chapterAt(chapters, positionMs);
  const spanMs = timeline.endsAtMs - timeline.startsAtMs;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Keyboard users reach the drawer from the pill and land back on it after closing.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement;
    const target = drawerRef.current?.querySelector<HTMLElement>('[aria-current="true"]') ?? closeRef.current;
    target?.focus();
    return () => {
      // Focus is on body once the focused node unmounts; anywhere else (e.g.
      // the Câmeras button that closed us) is where the user already is.
      const active = document.activeElement;
      const lost = active === null || active === document.body;
      if (lost && trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [open]);

  // Keep the playing chapter in view on open and as playback moves on.
  useEffect(() => {
    if (open) currentRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [open, current?.id]);

  if (!open) return null;

  return (
    <aside ref={drawerRef} className={styles.drawer} aria-label={t('chapters.label')}>
      <div className={styles.handle} aria-hidden="true" />
      <div className={styles.header}>
        <span className={styles.eyebrow}>{t('chapters.label')}</span>
        <span className={styles.count}>{chapters.length}</span>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={t('chapters.close')}>
          <X size={16} />
        </button>
      </div>

      <ol className={styles.list}>
        {chapters.map((chapter) => {
          const isCurrent = current?.id === chapter.id;
          const time = formatClock(chapter.startsAtMs - timeline.startsAtMs, spanMs);
          const duration = chapterDuration(chapter.endsAtMs - chapter.startsAtMs);
          const stageName = chapter.stageId ? stageNames?.[chapter.stageId] : undefined;
          return (
            <li
              key={chapter.id}
              ref={isCurrent ? currentRef : undefined}
              className={styles.item}
              data-current={isCurrent || undefined}
            >
              <button
                type="button"
                className={styles.jump}
                onClick={() => onSeek(chapter.startsAtMs)}
                aria-current={isCurrent || undefined}
                aria-label={t('chapters.goTo', { title: chapter.title, time })}
              >
                {isCurrent && (
                  <span className={styles.nowPlaying}>
                    <span className={styles.dot} />
                    {t('chapters.nowPlaying')}
                  </span>
                )}
                <span className={styles.meta}>
                  <span className={styles.time}>{time}</span>
                  <span className={styles.duration}>
                    {duration.unit === 'min'
                      ? t('chapters.durationMin', { count: duration.count })
                      : t('chapters.durationSec', { count: duration.count })}
                  </span>
                  {stageName && <span className={styles.stageTag}>{stageName}</span>}
                </span>
                <span className={styles.title}>{chapter.title}</span>
                {chapter.description && <span className={styles.description}>{chapter.description}</span>}
              </button>

              {chapter.artists.length > 0 && (
                <div className={styles.artists}>
                  {chapter.artists.map((artist) => (
                    // New tab: following an artist must not interrupt the video.
                    <a key={artist.id} href={`/artists/${artist.slug}`} target="_blank" rel="noopener noreferrer" className={styles.artist}>
                      {artist.name}
                      <ArrowUpRight size={11} />
                    </a>
                  ))}
                </div>
              )}

              {isCurrent && (
                <div className={styles.progress}>
                  <div className={styles.progressFill} style={{ '--pct': `${chapterProgressPct(chapter, positionMs)}%` } as CSSProperties} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
