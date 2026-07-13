'use client';

import { X, Square, PanelRight, LayoutGrid } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import type { ViewMode } from './CameraGrid';
import { VideoPanel } from './VideoPanel';
import styles from './CameraStrip.module.scss';

const MODES: { id: ViewMode; label: string; icon: typeof Square }[] = [
  { id: 'solo', label: 'Solo', icon: Square },
  { id: 'main-rail', label: 'Principal + trilha', icon: PanelRight },
  { id: 'grid', label: 'Grade', icon: LayoutGrid },
];

interface Props {
  cameras: LiveCamera[];
  activeCameraIds: string[];
  mainCameraId: string | null;
  onToggleCamera: (cameraId: string) => void;
  onSelectMain: (cameraId: string) => void;
  isModeLocked: boolean;
  effectiveMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  open: boolean;
  onClose: () => void;
  mode?: 'live' | 'replay';
  paused?: boolean;
  seekCommand?: { time: number; token: number } | null;
}

export function CameraStrip({
  cameras,
  activeCameraIds,
  mainCameraId,
  onToggleCamera,
  onSelectMain,
  isModeLocked,
  effectiveMode,
  onViewModeChange,
  open,
  onClose,
  mode = 'live',
  paused,
  seekCommand,
}: Props) {
  // Inactive -> activate it and bring it to the front (the whole point of
  // clicking a thumbnail is "show me this one"). Already the main/featured
  // one -> turn it off (guarded upstream: the last active camera can't be
  // removed). Active but not featured -> just switch focus to it, without
  // touching which cameras are active.
  const handleClick = (camera: LiveCamera) => {
    const isActive = activeCameraIds.includes(camera.cameraId);
    if (!isActive) {
      onToggleCamera(camera.cameraId);
      onSelectMain(camera.cameraId);
    } else if (camera.cameraId === mainCameraId) {
      onToggleCamera(camera.cameraId);
    } else {
      onSelectMain(camera.cameraId);
    }
  };

  // The strip stays mounted whether or not it's open — collapsing via
  // max-height (NOT unmounting / display:none / visibility:hidden) keeps the
  // thumbnail <video>s at their real size so they keep decoding at the live
  // edge in the background. Reopening reveals already-playing, in-sync
  // thumbnails instead of remounting them (which reloaded HLS and desynced).
  return (
    <div
      className={`${styles.collapse} ${open ? styles.collapseOpen : styles.collapseClosed}`}
      aria-hidden={!open}
    >
    <div className={styles.strip}>
      <div className={styles.side}>
        <div className={styles.sideTop}>
          <span className={styles.label}>MULTICAM</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar câmeras">
            <X size={10} />
          </button>
        </div>
        <span className={styles.count}>{cameras.length} CÂMERAS</span>
      </div>

      <div className={styles.thumbs}>
        {cameras.map((camera) => {
          const isActive = activeCameraIds.includes(camera.cameraId);
          const isMain = camera.cameraId === mainCameraId;
          return (
            <button
              key={camera.cameraId}
              onClick={() => handleClick(camera)}
              className={`${styles.thumb} ${isMain ? styles.thumbActive : ''}`}
            >
              <VideoPanel
                camera={camera}
                showLabel={false}
                showMuteButton={false}
                fit="cover"
                muted
                onMutedChange={() => {}}
                lowQuality
                mode={mode}
                paused={paused}
                seekCommand={seekCommand}
              />
              {isMain ? (
                <span className={styles.thumbBadge}>
                  <span className={styles.thumbDot} />
                  ATIVA
                </span>
              ) : isActive && mode === 'live' ? (
                <span className={styles.thumbBadgeLive}>
                  <span className={styles.thumbDotLive} />
                  LIVE
                </span>
              ) : null}
              <div className={styles.thumbInfo}>
                <p className={styles.thumbName}>{camera.name}</p>
                <p className={styles.thumbAngle}>{camera.slug}</p>
              </div>
            </button>
          );
        })}

        {!isModeLocked && (
          <div className={styles.modeGroup}>
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onViewModeChange(id)}
                title={label}
                aria-label={label}
                className={`${styles.modeBtn} ${effectiveMode === id ? styles.modeBtnActive : ''}`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
