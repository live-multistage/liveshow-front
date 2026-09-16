'use client';

import type { ReactNode } from 'react';
import { Settings, PictureInPicture, Maximize, Minimize } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SeekSlider } from '../SeekSlider';
import { PlayPauseButton } from '../transport/PlayPauseButton';
import { VolumeControl } from '../transport/VolumeControl';
import { PlayerMenu } from '../transport/PlayerMenu';
import controls from '../transport/transport-controls.module.scss';
import { usePlayer } from './PlayerContext';
import styles from './Transport.module.scss';

const AUTO_LEVEL = -1;

// <LiveBadge/> or <ReplayBadge/> — the bar doesn't know which mode it serves.
function Badge({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function Play() {
  const { shell } = usePlayer();
  return <PlayPauseButton paused={shell.paused} onTogglePlay={shell.togglePlay} />;
}

// Mode-agnostic scrubber: live feeds it the DVR window (see
// transport/live-scrubber.ts), replay the absolute event timeline.
export interface TransportScrubber {
  min: number;
  max: number;
  value: number;
  onSeek: (value: number) => void;
  leadingLabel: string;
  trailingLabel?: string;
}

function Scrubber({ min, max, value, onSeek, leadingLabel, trailingLabel }: TransportScrubber) {
  const t = useTranslations('player');
  return (
    <div className={styles.seekGroup}>
      <span className={styles.timeLabel}>{leadingLabel}</span>
      <SeekSlider min={min} max={max} value={value} onSeek={onSeek} ariaLabel={t('seekPosition')} />
      {trailingLabel && <span className={styles.timeLabel}>{trailingLabel}</span>}
    </div>
  );
}

// Declared in the scrubber's place by a mode that has none (a channel has no
// archive behind the origin window). The scrubber already stretches, so a
// second flexible gap alongside it would halve it — never declare both.
function Spacer() {
  return <div className={styles.spacer} />;
}

function Volume() {
  const { shell } = usePlayer();
  const { audio } = shell;
  return (
    <VolumeControl
      muted={audio.globalMuted}
      onToggleMute={() => audio.setGlobalMuted((m) => !m)}
      volume={audio.volume}
      onVolumeChange={audio.setVolume}
    />
  );
}

function AudioCamera() {
  const { shell } = usePlayer();
  const t = useTranslations('player');
  const { stageCameras, audio } = shell;

  if (stageCameras.length <= 1) return null;

  return (
    <PlayerMenu
      items={stageCameras.map((camera) => ({ id: camera.cameraId, label: camera.name }))}
      activeId={audio.effectiveAudioCameraId}
      onSelect={audio.handleAudioCameraChange}
      trigger={<Settings size={16} />}
      triggerClassName={controls.iconBtn}
      ariaLabel={t('chooseAudioCamera')}
      title={t('chooseAudioCamera')}
    />
  );
}

function Quality() {
  const { shell } = usePlayer();
  const t = useTranslations('player');
  const { levels, currentLevel, qualityLabel, onSelectLevel } = shell.quality;

  if (levels.length === 0) return null;

  return (
    <PlayerMenu
      items={[
        { id: String(AUTO_LEVEL), label: t('qualityAuto') },
        ...levels.map(({ index, height }) => ({ id: String(index), label: `${height}p` })),
      ]}
      activeId={String(currentLevel)}
      onSelect={(id) => onSelectLevel(Number(id))}
      trigger={qualityLabel}
      triggerClassName={controls.qualityBtn}
    />
  );
}

function Pip() {
  const { shell } = usePlayer();
  return (
    <button
      className={controls.iconBtn}
      onClick={shell.togglePictureInPicture}
      aria-label="Picture-in-Picture"
      title="Picture-in-Picture"
    >
      <PictureInPicture size={16} />
    </button>
  );
}

function Fullscreen() {
  const { shell } = usePlayer();
  const t = useTranslations('player');
  return (
    <button
      className={controls.iconBtn}
      onClick={shell.toggleFullscreen}
      aria-label={shell.isFullscreen ? t('exitFullscreen') : t('enterFullscreen')}
    >
      {shell.isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
    </button>
  );
}

export const Transport = { Badge, Play, Scrubber, Spacer, Volume, AudioCamera, Quality, Pip, Fullscreen };
