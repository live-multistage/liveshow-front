'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ChannelSourceEvent } from '../types/channel.types';
import styles from './NowPlayingBadge.module.scss';

interface Props {
  event: ChannelSourceEvent;
}

// Shown over the player while the channel is simulcasting a carried Event —
// links out to the Event's own page (ticket rules, chat and replay live
// there, not on the channel).
export function NowPlayingBadge({ event }: Props) {
  const t = useTranslations('channels');

  return (
    <Link href={`/events/${event.id}`} className={styles.badge}>
      {t('nowPlaying', { title: event.title })}
    </Link>
  );
}
