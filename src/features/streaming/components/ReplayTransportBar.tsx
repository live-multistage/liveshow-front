'use client';

import { useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, PictureInPicture, Maximize, Minimize } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import { SeekSlider } from './SeekSlider';
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

// Mirrors TransportBar's exact visual language (same module reused for the
// shared bits: iconBtn, volumeGroup, menu, qualityBtn) with play/pause + a
// seek scrubber added, and the AO VIVO badge swapped for a static REPLAY one
// — this is the app's own chrome for VOD playback, not the browser's native
// <video controls>.
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
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showQuality, setShowQuality] = useState(false);

  return (
    <div className={transportStyles.bar}>
      <button
        onClick={onTogglePlay}
        className={transportStyles.iconBtn}
        aria-label={paused ? 'Reproduzir' : 'Pausar'}
      >
        {paused ? <Play size={16} /> : <Pause size={16} />}
      </button>

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
          ariaLabel="Posição de reprodução"
        />
        <span className={styles.timeLabel}>{formatTime((timelineEndMs - timelineStartMs) / 1000)}</span>
      </div>

      <div className={transportStyles.volumeGroup}>
        <button
          onClick={onToggleMute}
          className={transportStyles.iconBtn}
          aria-label={globalMuted ? 'Ativar som' : 'Silenciar'}
        >
          {globalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={globalMuted ? 0 : volume}
          onChange={(e) => {
            onVolumeChange(Number(e.target.value));
            if (globalMuted) onToggleMute();
          }}
          className={transportStyles.volumeSlider}
          style={{
            background: `linear-gradient(to right, #ff2e9e ${(globalMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.15) ${(globalMuted ? 0 : volume) * 100}%)`,
          }}
          aria-label="Volume"
        />
      </div>

      {audioCameras.length > 1 && (
        <div className={transportStyles.menuWrapper}>
          {showAudioMenu && (
            <div className={transportStyles.menu}>
              {audioCameras.map((cam) => (
                <button
                  key={cam.cameraId}
                  className={cam.cameraId === effectiveAudioCameraId ? transportStyles.menuItemActive : transportStyles.menuItem}
                  onClick={() => {
                    onAudioCameraChange(cam.cameraId);
                    setShowAudioMenu(false);
                  }}
                >
                  {cam.name}
                </button>
              ))}
            </div>
          )}
          <button
            className={transportStyles.iconBtn}
            onClick={() => setShowAudioMenu((s) => !s)}
            aria-label="Escolher câmera com áudio"
            title="Escolher câmera com áudio"
          >
            <Settings size={16} />
          </button>
        </div>
      )}

      {levels.length > 0 && (
        <div className={transportStyles.menuWrapper}>
          {showQuality && (
            <div className={transportStyles.menu}>
              <button
                className={currentLevel === -1 ? transportStyles.menuItemActive : transportStyles.menuItem}
                onClick={() => {
                  onSelectLevel(-1);
                  setShowQuality(false);
                }}
              >
                Auto
              </button>
              {levels.map(({ index, height }) => (
                <button
                  key={index}
                  className={index === currentLevel ? transportStyles.menuItemActive : transportStyles.menuItem}
                  onClick={() => {
                    onSelectLevel(index);
                    setShowQuality(false);
                  }}
                >
                  {height}p
                </button>
              ))}
            </div>
          )}
          <button className={transportStyles.qualityBtn} onClick={() => setShowQuality((s) => !s)}>
            {qualityLabel}
          </button>
        </div>
      )}

      <button className={transportStyles.iconBtn} onClick={onTogglePip} aria-label="Picture-in-Picture" title="Picture-in-Picture">
        <PictureInPicture size={16} />
      </button>

      <button
        className={transportStyles.iconBtn}
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </div>
  );
}
