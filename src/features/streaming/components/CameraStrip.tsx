'use client';

import { X, Square, PanelRight, LayoutGrid } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import type { ViewMode } from './CameraGrid';
import styles from './CameraStrip.module.scss';

const MODES: { id: ViewMode; label: string; icon: typeof Square }[] = [
  { id: 'solo', label: 'Solo', icon: Square },
  { id: 'main-rail', label: 'Principal + trilha', icon: PanelRight },
  { id: 'grid', label: 'Grade', icon: LayoutGrid },
];

interface Props {
  cameras: LiveCamera[];
  activeCameraIds: string[];
  onToggleCamera: (cameraId: string) => void;
  isModeLocked: boolean;
  effectiveMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  open: boolean;
  onClose: () => void;
}

export function CameraStrip({
  cameras,
  activeCameraIds,
  onToggleCamera,
  isModeLocked,
  effectiveMode,
  onViewModeChange,
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
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
          return (
            <button
              key={camera.cameraId}
              onClick={() => onToggleCamera(camera.cameraId)}
              className={`${styles.thumb} ${isActive ? styles.thumbActive : ''}`}
            >
              {isActive && (
                <span className={styles.thumbBadge}>
                  <span className={styles.thumbDot} />
                  ATIVA
                </span>
              )}
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
  );
}
