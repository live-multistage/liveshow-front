'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Settings, PictureInPicture, Maximize, Minimize } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import { SeekSlider } from './SeekSlider';
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
  const showScrubber = !!dvr && !!onSeek && dvr.end - dvr.start >= MIN_DVR_WINDOW_SEC;

  return (
    <div className={styles.bar}>
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
          title="Voltar ao ao vivo"
          aria-label="Voltar ao ao vivo"
        >
          <span className={styles.liveDotBehind} />
          AO VIVO
        </button>
      )}

      {dvr && onSeek && showScrubber && (
        <div className={styles.seekGroup}>
          <span className={styles.timeLabel}>{formatBehind(dvr.edge - dvr.position)}</span>
          <SeekSlider
            min={dvr.start}
            max={dvr.end}
            value={dvr.position}
            onSeek={onSeek}
            ariaLabel="Posição de reprodução"
          />
        </div>
      )}

      <div className={styles.volumeGroup}>
        <button
          onClick={onToggleMute}
          className={styles.iconBtn}
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
          className={styles.volumeSlider}
          style={{
            background: `linear-gradient(to right, #ff2e9e ${(globalMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.15) ${(globalMuted ? 0 : volume) * 100}%)`,
          }}
          aria-label="Volume"
        />
      </div>

      {/* The scrubber already stretches; a second flexible gap would halve it. */}
      {!showScrubber && <div className={styles.spacer} />}

      {audioCameras.length > 1 && (
        <div className={styles.menuWrapper}>
          {showAudioMenu && (
            <div className={styles.menu}>
              {audioCameras.map((cam) => (
                <button
                  key={cam.cameraId}
                  className={cam.cameraId === effectiveAudioCameraId ? styles.menuItemActive : styles.menuItem}
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
            className={styles.iconBtn}
            onClick={() => setShowAudioMenu((s) => !s)}
            aria-label="Escolher câmera com áudio"
            title="Escolher câmera com áudio"
          >
            <Settings size={16} />
          </button>
        </div>
      )}

      {levels.length > 0 && (
        <div className={styles.menuWrapper}>
          {showQuality && (
            <div className={styles.menu}>
              <button
                className={currentLevel === -1 ? styles.menuItemActive : styles.menuItem}
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
                  className={index === currentLevel ? styles.menuItemActive : styles.menuItem}
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
          <button className={styles.qualityBtn} onClick={() => setShowQuality((s) => !s)}>
            {qualityLabel}
          </button>
        </div>
      )}

      <button className={styles.iconBtn} onClick={onTogglePip} aria-label="Picture-in-Picture" title="Picture-in-Picture">
        <PictureInPicture size={16} />
      </button>

      <button
        className={styles.iconBtn}
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </div>
  );
}
