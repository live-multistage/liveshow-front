'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import { SeekSlider } from './SeekSlider';
import { PlayPauseButton } from './transport/PlayPauseButton';
import { VolumeControl } from './transport/VolumeControl';
import { TransportRightControls } from './transport/TransportRightControls';
import type { TransportScrubber } from './player/Transport';
import styles from './TransportBar.module.scss';

interface Props {
  paused: boolean;
  onTogglePlay: () => void;
  // False no player de canal: sem arquivo atrás da janela da origem, não há
  // como pausar — o controle some. O badge fica: um canal está sempre ao vivo.
  showPlayback?: boolean;
  // <LiveBadge/> or <ReplayBadge/> — the bar doesn't know which mode it serves.
  badge: ReactNode;
  scrubber?: TransportScrubber | null;
  globalMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
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

export function TransportBar({
  paused,
  onTogglePlay,
  showPlayback = true,
  badge,
  scrubber = null,
  globalMuted,
  onToggleMute,
  volume,
  onVolumeChange,
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
}: Props) {
  const t = useTranslations('player');

  return (
    <div className={styles.bar}>
      {showPlayback && <PlayPauseButton paused={paused} onTogglePlay={onTogglePlay} />}

      {badge}

      {scrubber && (
        <div className={styles.seekGroup}>
          <span className={styles.timeLabel}>{scrubber.leadingLabel}</span>
          <SeekSlider
            min={scrubber.min}
            max={scrubber.max}
            value={scrubber.value}
            onSeek={scrubber.onSeek}
            ariaLabel={t('seekPosition')}
          />
          {scrubber.trailingLabel && <span className={styles.timeLabel}>{scrubber.trailingLabel}</span>}
        </div>
      )}

      <VolumeControl
        muted={globalMuted}
        onToggleMute={onToggleMute}
        volume={volume}
        onVolumeChange={onVolumeChange}
      />

      {/* The scrubber already stretches; a second flexible gap would halve it. */}
      {!scrubber && <div className={styles.spacer} />}

      <TransportRightControls
        audioCameras={audioCameras}
        effectiveAudioCameraId={effectiveAudioCameraId}
        onAudioCameraChange={onAudioCameraChange}
        levels={levels}
        currentLevel={currentLevel}
        qualityLabel={qualityLabel}
        onSelectLevel={onSelectLevel}
        onTogglePip={onTogglePip}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
      />
    </div>
  );
}
