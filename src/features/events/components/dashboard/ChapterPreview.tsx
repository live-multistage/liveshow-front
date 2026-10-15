'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { parseOffset, type ChapterDraft } from '../../utils/replay-chapter-drafts';
import type { NamedOption } from './ChapterCard';
import styles from './ChapterPreview.module.scss';

interface Props {
  drafts: ChapterDraft[];
  // Keys of the drafts that currently fail validation; drawn in red.
  invalidKeys: ReadonlySet<string>;
  spanMs: number;
  replayDuration: string;
  multiStage: boolean;
  stages: NamedOption[];
}

interface Segment {
  key: string;
  title: string;
  time: string;
  leftPct: number;
  widthPct: number;
  invalid: boolean;
}

function segmentsFor(drafts: ChapterDraft[], spanMs: number, invalidKeys: ReadonlySet<string>): Segment[] {
  return drafts.flatMap((d) => {
    const start = parseOffset(d.startText);
    const end = parseOffset(d.endText);
    if (start === null || end === null || end <= start || start >= spanMs) return [];
    const to = Math.min(end, spanMs);
    return [{
      key: d.key,
      title: d.title,
      time: `${d.startText} – ${d.endText}`,
      leftPct: (start / spanMs) * 100,
      widthPct: ((to - start) / spanMs) * 100,
      invalid: invalidKeys.has(d.key),
    }];
  });
}

// Overlaps are drawn as-is (they are validation errors the organizer must see),
// so this is not the player's gap-filling chapterTrackSegments.
export function ChapterPreview({ drafts, invalidKeys, spanMs, replayDuration, multiStage, stages }: Props) {
  const t = useTranslations('replayChaptersEditor');
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const tracks = multiStage
    ? [{ id: null as string | null, label: t('allStages') }, ...stages.map((s) => ({ id: s.id as string | null, label: s.name }))]
    : [{ id: null as string | null, label: null }];

  return (
    <div className={styles.preview} role="img" aria-label={t('previewLabel')}>
      <div className={multiStage ? styles.multi : undefined}>
        <div className={styles.head}>
          <span className={styles.title}>{t('previewTitle')}</span>
          <span className={styles.count}>{t('previewCount', { count: drafts.length })}</span>
        </div>

        <div className={styles.tracks}>
          {tracks.map((track) => {
            const own = multiStage ? drafts.filter((d) => d.stageId === track.id) : drafts;
            const segments = segmentsFor(own, spanMs, invalidKeys);
            const hovered = segments.find((s) => s.key === hoverKey);
            return (
              <div key={track.id ?? 'all'} className={`${styles.track} ${multiStage ? styles.trackLabeled : ''}`}>
                {track.label && <span className={styles.trackLabel}>{track.label}</span>}
                <div className={styles.bar}>
                  <div className={styles.rail} />
                  {segments.map((s) => (
                    <div
                      key={s.key}
                      data-testid="chapter-segment"
                      data-invalid={s.invalid || undefined}
                      className={`${styles.segment} ${s.invalid ? styles.segmentInvalid : ''} ${hoverKey === s.key ? styles.segmentHot : ''}`}
                      style={{ '--left': `${s.leftPct}%`, '--width': `${s.widthPct}%` } as React.CSSProperties}
                      onMouseEnter={() => setHoverKey(s.key)}
                      onMouseLeave={() => setHoverKey(null)}
                    />
                  ))}
                  {hovered && (
                    <div
                      className={styles.tip}
                      style={{ '--center': `${hovered.leftPct + hovered.widthPct / 2}%` } as React.CSSProperties}
                    >
                      <div className={`${styles.tipTime} ${hovered.invalid ? styles.tipTimeInvalid : ''}`}>{hovered.time}</div>
                      <div className={styles.tipTitle}>{hovered.title}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`${styles.axis} ${multiStage ? styles.trackLabeled : ''}`}>
          {multiStage && <span />}
          <div className={styles.axisLabels}><span>0:00</span><span>{replayDuration}</span></div>
        </div>
      </div>
    </div>
  );
}
