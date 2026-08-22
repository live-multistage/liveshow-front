'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Badge, Button } from '@live-show/design-system';
import { useSeriesEpisodesQuery } from '../../queries/series.queries';
import { useReattachEpisodeMutation } from '../../mutations/series.mutations';
import styles from './EpisodesTable.module.scss';

interface Props {
  seriesId: string;
}

export function EpisodesTable({ seriesId }: Props) {
  const t = useTranslations('series');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { data: episodes = [], isLoading } = useSeriesEpisodesQuery(seriesId);
  const reattach = useReattachEpisodeMutation();

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
      <h2 className={styles.heading}>{t('dashboard.episodes')}</h2>

      {isLoading && <p className={styles.state}>{tCommon('loading')}</p>}

      {!isLoading && episodes.length === 0 && (
        <p className={styles.state}>{t('dashboard.empty')}</p>
      )}

      {episodes.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('dashboard.episodeDate')}</th>
              <th>{t('dashboard.episodeStatusLabel')}</th>
              <th>{t('dashboard.episodeSales')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {episodes.map((episode) => (
              <tr key={episode.id}>
                <td>
                  <Link href={`/dashboard/events/${episode.id}`} className={styles.titleLink}>
                    {episode.title}
                  </Link>
                  <span className={styles.date}>{formatDate(episode.startsAt)}</span>
                </td>
                <td>
                  <Badge variant="outline">
                    {t(`dashboard.episodeStatus.${episode.status}`)}
                  </Badge>
                </td>
                <td>
                  {episode.hasSales && <Badge variant="outline">{t('dashboard.hasSales')}</Badge>}
                </td>
                <td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
