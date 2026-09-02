'use client';

import { useTranslations } from 'next-intl';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import { SeekSlider } from './SeekSlider';
import { PlayPauseButton } from './transport/PlayPauseButton';
import { VolumeControl } from './transport/VolumeControl';
import { TransportRightControls } from './transport/TransportRightControls';
import transportStyles from './TransportBar.module.scss';
import styles from './ReplayTransportBar.module.scss';

interface Props {
  paused: boolean;
  onTogglePlay: () => void;
  // Absolute event-timeline domain (ms) — NOT a camera's local duration. The
  // scrubber spans the whole event, since cameras can join/leave mid-way and
  // no single camera's local time is a valid stand-in for it.
  timelineStartMs: number;
  timelineEndMs: number;
  // Absolute instant (ms) currently playing — see ReplayPlayer's positionMs.
  positionMs: number;
  onSeek: (absoluteMs: number) => void;
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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Mirrors TransportBar's exact visual language by composing the same shared
// pieces (PlayPauseButton, VolumeControl, TransportRightControls) with
// play/pause + a seek scrubber added, and the AO VIVO badge swapped for a
// static REPLAY one — this is the app's own chrome for VOD playback, not the
// browser's native <video controls>.
export function ReplayTransportBar({
  paused,
  onTogglePlay,
  timelineStartMs,
  timelineEndMs,
  positionMs,
  onSeek,
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
    <div className={transportStyles.bar}>
      <PlayPauseButton paused={paused} onTogglePlay={onTogglePlay} />

      <span className={styles.replayBadge}>REPLAY</span>

      <div className={styles.seekGroup}>
        {/* Labels show elapsed-since-timeline-start (0:00 at the beginning),
            not the underlying wall-clock ms — viewers read a stopwatch, not a date. */}
        <span className={styles.timeLabel}>{formatTime((positionMs - timelineStartMs) / 1000)}</span>
        <SeekSlider
          min={timelineStartMs}
          max={timelineEndMs}
          value={positionMs}
          onSeek={onSeek}
          ariaLabel={t('seekPosition')}
        />
        <span className={styles.timeLabel}>{formatTime((timelineEndMs - timelineStartMs) / 1000)}</span>
      </div>

      <VolumeControl
        muted={globalMuted}
        onToggleMute={onToggleMute}
        volume={volume}
        onVolumeChange={onVolumeChange}
      />

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
