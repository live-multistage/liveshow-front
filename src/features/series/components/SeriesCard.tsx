'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { SeriesListItem } from '../types/series.types';
import { getRecurrenceParts, formatStartTime } from '../utils/recurrence';
import styles from './SeriesCard.module.scss';

interface Props {
  series: SeriesListItem;
}

// Cartão de série do catálogo público (trilho da home e listagem /series).
// SeriesResponse não carrega capa própria — usa a miniatura do próximo
// episódio quando existe, senão a inicial do nome (mesmo fallback do
// ChannelCard).
export function SeriesCard({ series }: Props) {
  const t = useTranslations('series');
  const locale = useLocale();
  const recurrenceParts = getRecurrenceParts(
    series.rrule,
    formatStartTime(series.dtstart, series.timezone),
    locale,
  );
  const recurrence =
    recurrenceParts.type === 'daily'
      ? t('recurrence.daily', { time: recurrenceParts.time })
      : t('recurrence.weekly', { day: recurrenceParts.day, time: recurrenceParts.time });
  const cover = series.nextEpisode?.thumbnailUrl ?? null;

  return (
    <Link href={`/series/${series.slug}`} className={styles.card}>
      <div className={styles.cover}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className={styles.coverImage} />
        ) : (
          <div className={styles.coverFallback} aria-hidden="true">
            {series.name.charAt(0)}
          </div>
        )}
      </div>

      <div className={styles.body}>
        <p className={styles.name}>{series.name}</p>
        <p className={styles.recurrence}>{recurrence}</p>
        {series.nextEpisode && (
          <p className={styles.nextEpisode}>
            <span className={styles.nextLabel}>{t('nextEpisode')}</span>
            {series.nextEpisode.title}
          </p>
        )}
      </div>
    </Link>
  );
}
