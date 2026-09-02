'use client';

import type { CSSProperties } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './transport-controls.module.scss';

interface VolumeControlProps {
  muted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeControl({ muted, onToggleMute, volume, onVolumeChange }: VolumeControlProps) {
  const t = useTranslations('player');
  const effective = muted ? 0 : volume;

  return (
    <div className={styles.volumeGroup}>
      <button
        onClick={onToggleMute}
        className={styles.iconBtn}
        aria-label={muted ? t('unmute') : t('mute')}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={effective}
        onChange={(e) => {
          onVolumeChange(Number(e.target.value));
          if (muted) onToggleMute();
        }}
        className={styles.volumeSlider}
        style={{ '--fill': `${effective * 100}%` } as CSSProperties}
        aria-label={t('volume')}
      />
    </div>
  );
}
