'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Play } from 'lucide-react';
import type { PlaybackProgressEntry } from '@/features/playback-progress';
import { coverGradient, coverUrl, placeLabel } from '@/shared/utils/event-cover';
import { watchedSummary } from '../utils/format';
import type { AccessibleEvent } from '../types/my-list.types';
import styles from './ContinueWatchingCard.module.scss';

interface Props {
  event: AccessibleEvent;
  progress: PlaybackProgressEntry;
}

export function ContinueWatchingCard({ event, progress }: Props) {
  const t = useTranslations('myList');
  const cover = coverUrl(event);
  const place = placeLabel(event);
  const summary = watchedSummary(progress.positionSeconds, progress.durationSeconds);

  return (
    <Link href={`/replay/${event.id}`} className={styles.card}>
      <div className={styles.cover} style={{ background: coverGradient(event.id) }}>
        {cover && <img src={cover} alt="" className={styles.image} />}
        <span className={styles.playBadge} aria-hidden="true">
          <Play size={13} fill="currentColor" strokeWidth={0} />
        </span>

        {/* A barra é o resumo visual do progresso; o texto abaixo diz o mesmo
            em palavras, então ela fica fora da árvore de acessibilidade. */}
        {summary && (
          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${summary.percent}%` }} />
          </div>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{event.title}</h3>
        {place && <p className={styles.place}>{place}</p>}
        {summary && (
          <p className={styles.remaining}>
            {t('remaining', { time: summary.remaining, percent: summary.percent })}
          </p>
        )}
      </div>
    </Link>
  );
}
