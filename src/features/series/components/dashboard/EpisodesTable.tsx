'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
import { Button } from '@live-show/design-system';
import type { EventStatus } from '@/features/events/types/event.types';
import { useSeriesEpisodesQuery } from '../../queries/series.queries';
import { useReattachEpisodeMutation } from '../../mutations/series.mutations';
import styles from './EpisodesTable.module.scss';

interface Props {
  seriesId: string;
}

const STATUS_STYLE: Record<EventStatus, string> = {
  DRAFT: styles.statusMuted,
  PUBLISHED: styles.statusScheduled,
  SCHEDULED: styles.statusScheduled,
  LIVE: styles.statusLive,
  FINISHED: styles.statusMuted,
  CANCELLED: styles.statusMuted,
};

export function EpisodesTable({ seriesId }: Props) {
  const t = useTranslations('series');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { data: episodes = [], isLoading } = useSeriesEpisodesQuery(seriesId);
  const reattach = useReattachEpisodeMutation();

  const dateChip = (iso: string) => {
    const date = new Date(iso);
    return {
      month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace('.', ''),
      day: new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date),
    };
  };
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));

  return (
    <section className={styles.section}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>{t('dashboard.episodes')}</h2>
        {episodes.length > 0 && (
          <span className={styles.countChip}>{t('dashboard.episodesTotal', { count: episodes.length })}</span>
        )}
      </div>

      {isLoading && <p className={styles.state}>{tCommon('loading')}</p>}

      {!isLoading && episodes.length === 0 && (
        <p className={styles.state}>{t('dashboard.empty')}</p>
      )}

      {episodes.length > 0 && (
        <div className={styles.card}>
          <div className={clsx(styles.grid, styles.gridHead)}>
            <span>{t('dashboard.episodeColumn')}</span>
            <span>{t('dashboard.episodeStatusLabel')}</span>
            <span>{t('dashboard.episodeSales')}</span>
            <span className={styles.srOnly}>{t('dashboard.episodeActions')}</span>
          </div>

          {episodes.map((episode) => {
            const chip = dateChip(episode.startsAt);
            const live = episode.status === 'LIVE';
            return (
              <div key={episode.id} className={styles.grid}>
                <div className={styles.epCell}>
                  <div className={clsx(styles.dateChip, live && styles.dateChipLive)}>
                    <span className={styles.dateMonth}>{chip.month}</span>
                    <span className={styles.dateDay}>{chip.day}</span>
                  </div>
                  <div className={styles.epText}>
                    <Link href={`/dashboard/events/${episode.id}`} className={styles.titleLink}>
                      {episode.title}
                    </Link>
                    <span className={styles.date}>{formatDate(episode.startsAt)}</span>
                  </div>
                </div>

                <div>
                  <span className={clsx(styles.statusPill, STATUS_STYLE[episode.status])}>
                    {live && <span className={styles.statusDot} />}
                    {t(`dashboard.episodeStatus.${episode.status}`)}
                  </span>
                </div>

                <div className={styles.salesCell}>
                  {episode.hasSales ? (
                    <span className={styles.hasSales}>{t('dashboard.hasSales')}</span>
                  ) : (
                    <span className={styles.noSales}>{t('dashboard.noSales')}</span>
                  )}
                </div>

                <div className={styles.actionsCell}>
                  {episode.detachedFromSeries && (
                    <div className={styles.detached}>
                      <span className={styles.detachedLabel}>{t('dashboard.detached')}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reattach.isPending}
                        onClick={() => reattach.mutate({ seriesId, eventId: episode.id })}
                      >
                        {t('dashboard.reattach')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
