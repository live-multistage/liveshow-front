'use client';

import { useTranslations } from 'next-intl';
import styles from '../TransportBar.module.scss';

interface Props {
  atLive: boolean;
  // Scrubbed back: the badge stops claiming "live" and becomes the way back
  // to the edge.
  onBackToLive?: () => void;
}

export function LiveBadge({ atLive, onBackToLive }: Props) {
  const t = useTranslations('player');

  if (atLive) {
    return (
      <span className={styles.liveBadge}>
        <span className={styles.liveDot} />
        AO VIVO
      </span>
    );
  }

  return (
    <button
      type="button"
      className={styles.liveBadgeBehind}
      onClick={onBackToLive}
      title={t('backToLive')}
      aria-label={t('backToLive')}
    >
      <span className={styles.liveDotBehind} />
      AO VIVO
    </button>
  );
}
