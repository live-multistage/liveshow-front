'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ProgramEpisode } from '../../types/channel.types';
import styles from './ProgramEpisodesList.module.scss';

interface Props {
  episodes: ProgramEpisode[];
}

// Every occurrence Event a Program has ever opened, newest first (the query
// already returns them in that order). Only a FINISHED episode has a replay
// worth linking to — anything else (LIVE, SCHEDULED, CANCELLED) has nothing
// to play back yet.
export function ProgramEpisodesList({ episodes }: Props) {
  const t = useTranslations('channels.program.episodes');
  const locale = useLocale();

  if (episodes.length === 0) return null;

  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{t('title')}</th>
          <th>{t('date')}</th>
          <th>{t('status')}</th>
        </tr>
      </thead>
      <tbody>
        {episodes.map((episode) => (
          <tr key={episode.id}>
            <td>
              {episode.status === 'FINISHED' ? (
                <Link href={`/events/${episode.id}`}>{episode.title}</Link>
              ) : (
                episode.title
              )}
            </td>
            <td>{dateFormat.format(new Date(episode.startsAt))}</td>
            <td>
              <span className={`${styles.badge} ${styles[`badge${episode.status}`]}`}>
                {t(`status${episode.status}`)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
