'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Settings, PictureInPicture, Maximize, Minimize } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import styles from './TransportBar.module.scss';

interface Props {
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
    <div className={styles.bar}>
      <div className={styles.liveBadge}>
        <span className={styles.liveDot} />
        AO VIVO
      </div>

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

      <div className={styles.spacer} />

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
