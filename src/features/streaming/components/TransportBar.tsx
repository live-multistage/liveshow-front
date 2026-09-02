'use client';

import { useTranslations } from 'next-intl';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import { SeekSlider } from './SeekSlider';
import { PlayPauseButton } from './transport/PlayPauseButton';
import { VolumeControl } from './transport/VolumeControl';
import { TransportRightControls } from './transport/TransportRightControls';
import styles from './TransportBar.module.scss';

// Below this the seekable window is just the player's own buffer, not real
// DVR history — a scrubber over it would be a control with nowhere to go.
const MIN_DVR_WINDOW_SEC = 30;

// How far behind the live edge the viewer currently is, e.g. "-1:23".
function formatBehind(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `-${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export interface DvrState {
  // Bounds of the seekable window and the primary panel's position in it.
  start: number;
  end: number;
  position: number;
  // What "live" means right now (hls.js's liveSyncPosition), a few segments
  // behind `end`.
  edge: number;
  // How close to `edge` still counts as live — wider on Safari's native path,
  // which parks further back by design. See use-transport-controls.
  tolerance: number;
}

interface Props {
  // Live DVR readout from the primary camera panel. Null until the first
  // progress report arrives.
  dvr?: DvrState | null;
  // False once the viewer has scrubbed back out of the live edge tolerance.
  atLive?: boolean;
  onSeek?: (time: number) => void;
  // Pausing a live stream is a DVR rewind: the broadcast keeps running, so
  // resuming continues from where the viewer stopped, and the AO VIVO badge
  // becomes the way back to the edge.
  paused: boolean;
  onTogglePlay: () => void;
  // False no player de canal: sem arquivo atrás da janela da origem, não há
  // como pausar nem para onde voltar — os dois controles somem juntos. O
  // badge AO VIVO fica: um canal está sempre ao vivo.
  showPlayback?: boolean;
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
  dvr = null,
  atLive = true,
  onSeek,
  paused,
  onTogglePlay,
  showPlayback = true,
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
  const showScrubber =
    showPlayback && !!dvr && !!onSeek && dvr.end - dvr.start >= MIN_DVR_WINDOW_SEC;

  return (
    <div className={styles.bar}>
      {showPlayback && <PlayPauseButton paused={paused} onTogglePlay={onTogglePlay} />}

      {atLive ? (
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} />
          AO VIVO
        </span>
      ) : (
        // Scrubbed back: the badge stops claiming "live" and becomes the way
        // back to it.
        <button
          type="button"
          className={styles.liveBadgeBehind}
          onClick={() => dvr && onSeek?.(dvr.edge)}
          title={t('backToLive')}
          aria-label={t('backToLive')}
        >
          <span className={styles.liveDotBehind} />
          AO VIVO
        </button>
      )}

      {showScrubber && dvr && onSeek && (
        <div className={styles.seekGroup}>
          <span className={styles.timeLabel}>{formatBehind(dvr.edge - dvr.position)}</span>
          <SeekSlider
            min={dvr.start}
            max={dvr.end}
            value={dvr.position}
            onSeek={onSeek}
            ariaLabel={t('seekPosition')}
          />
        </div>
      )}

      <VolumeControl
        muted={globalMuted}
        onToggleMute={onToggleMute}
        volume={volume}
        onVolumeChange={onVolumeChange}
      />

      {/* The scrubber already stretches; a second flexible gap would halve it. */}
      {!showScrubber && <div className={styles.spacer} />}

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
