'use client';

import { Settings, PictureInPicture, Maximize, Minimize } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LiveCamera } from '../../types/live.types';
import type { QualityLevel } from '../../hooks/use-hls-player';
import { PlayerMenu } from './PlayerMenu';
import styles from './transport-controls.module.scss';

// Everything sitting at the right end of both transport bars (live + replay):
// audio-camera menu, quality menu, PiP, fullscreen. Identical across the two,
// so it lives once here.
export interface TransportRightControlsProps {
  audioCameras: LiveCamera[];
  effectiveAudioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  levels: QualityLevel[];
  currentLevel: number;
  qualityLabel: string;
  onSelectLevel: (level: number) => void;
  onTogglePip: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const AUTO_LEVEL = -1;

export function TransportRightControls({
  audioCameras,
  effectiveAudioCameraId,
  onAudioCameraChange,
  levels,
  currentLevel,
  qualityLabel,
  onSelectLevel,
  onTogglePip,
  isFullscreen,
  onToggleFullscreen,
}: TransportRightControlsProps) {
  const t = useTranslations('player');

  return (
    <>
      {audioCameras.length > 1 && (
        <PlayerMenu
          items={audioCameras.map((cam) => ({ id: cam.cameraId, label: cam.name }))}
          activeId={effectiveAudioCameraId}
          onSelect={onAudioCameraChange}
          trigger={<Settings size={16} />}
          triggerClassName={styles.iconBtn}
          ariaLabel={t('chooseAudioCamera')}
          title={t('chooseAudioCamera')}
        />
      )}

      {levels.length > 0 && (
        <PlayerMenu
          items={[
            { id: String(AUTO_LEVEL), label: t('qualityAuto') },
            ...levels.map(({ index, height }) => ({ id: String(index), label: `${height}p` })),
          ]}
          activeId={String(currentLevel)}
          onSelect={(id) => onSelectLevel(Number(id))}
          trigger={qualityLabel}
          triggerClassName={styles.qualityBtn}
        />
      )}

      <button className={styles.iconBtn} onClick={onTogglePip} aria-label="Picture-in-Picture" title="Picture-in-Picture">
        <PictureInPicture size={16} />
      </button>

      <button
        className={styles.iconBtn}
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </>
  );
}
