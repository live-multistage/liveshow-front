'use client';

import { Play, Pause } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './transport-controls.module.scss';

interface PlayPauseButtonProps {
  paused: boolean;
  onTogglePlay: () => void;
}

export function PlayPauseButton({ paused, onTogglePlay }: PlayPauseButtonProps) {
  const t = useTranslations('player');
  return (
    <button
      type="button"
      onClick={onTogglePlay}
      className={styles.iconBtn}
      aria-label={paused ? t('play') : t('pause')}
    >
      {paused ? <Play size={16} /> : <Pause size={16} />}
    </button>
  );
}
