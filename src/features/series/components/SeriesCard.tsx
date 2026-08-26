'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
import type { SeriesListItem } from '../types/series.types';
import { getRecurrenceParts, formatStartTime } from '../utils/recurrence';
import { formatCountdown, formatEpisodeWhen } from '../utils/countdown';
import styles from './SeriesCard.module.scss';

interface Props {
  series: SeriesListItem;
}

// Cartão de programa do catálogo público (trilho da home e listagem /series).
// Forma "conjunto": pilha de cards atrás da capa (episódios, não sessão única),
// regra de recorrência no topo e bloco de próximo episódio com contagem.
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
      ? t('recurrence.badgeDaily')
      : t('recurrence.badgeWeekly', { day: recurrenceParts.day });
  const cover = series.nextEpisode?.thumbnailUrl ?? null;
  const ended = series.status === 'ENDED';
  const countdown = series.nextEpisode ? formatCountdown(series.nextEpisode.startsAt) : null;

  return (
    <Link href={`/series/${series.slug}`} className={styles.card}>
      <span className={clsx(styles.deckLayer, styles.deckLayerBack)} aria-hidden="true" />
      <span className={clsx(styles.deckLayer, styles.deckLayerFront)} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.cover}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className={styles.coverImage} />
          ) : (
            <div className={styles.coverFallback} aria-hidden="true" />
          )}

          <span className={styles.recurrenceBadge}>
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              aria-hidden="true"
            >
              <path d="M17 2l3 3-3 3M20 5H8a4 4 0 0 0-4 4M7 22l-3-3 3-3M4 19h12a4 4 0 0 0 4-4" />
            </svg>
            {recurrence}
          </span>
          <span className={styles.episodesBadge}>
            {t('episodesShort', { count: series.episodeCount })}
          </span>
        </div>

        <div className={styles.body}>
          <p className={styles.name}>{series.name}</p>

          <div className={styles.nextBlock}>
            <div className={styles.nextHeader}>
              <span className={styles.nextLabel}>
                {ended ? t('seasonEnded') : t('nextEpisodeLabel')}
              </span>
              {ended ? (
                <span className={clsx(styles.countdown, styles.countdownMuted)}>
                  {t('replayBadge')}
                </span>
              ) : (
                countdown && (
                  <span className={styles.countdown} suppressHydrationWarning>
                    {t('inCountdown', { value: countdown })}
                  </span>
                )
              )}
            </div>
            {series.nextEpisode ? (
              <>
                <span className={styles.nextTitle}>{series.nextEpisode.title}</span>
                <span className={styles.nextWhen}>
                  {formatEpisodeWhen(series.nextEpisode.startsAt, series.timezone, locale)}
                </span>
              </>
            ) : (
              <span className={clsx(styles.nextTitle, styles.nextTitleMuted)}>
                {ended ? t('endedHint') : t('noUpcoming')}
              </span>
            )}
          </div>

          <span className={styles.cta}>{ended ? t('viewEpisodes') : t('follow')}</span>
        </div>
      </div>
    </Link>
  );
}
