'use client';

import { X, Square, PanelRight, LayoutGrid } from 'lucide-react';
import type { ViewMode } from './CameraGrid';
import styles from './StripControls.module.scss';

const MODES: { id: ViewMode; label: string; icon: typeof Square }[] = [
  { id: 'solo', label: 'Solo', icon: Square },
  { id: 'main-rail', label: 'Principal + trilha', icon: PanelRight },
  { id: 'grid', label: 'Grade', icon: LayoutGrid },
];

interface Props {
  count: number;
  isModeLocked: boolean;
  effectiveMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  open: boolean;
  onClose: () => void;
}

// Chrome-only picker controls. The camera thumbnails are rendered by CameraGrid
// as the `strip` role (one decoder per camera, reused). This bar only carries
// the MULTICAM label, camera count, close button and the view-mode buttons.
export function StripControls({
  count,
  isModeLocked,
  effectiveMode,
  onViewModeChange,
  open,
  onClose,
}: Props) {
  return (
    <div
      className={`${styles.collapse} ${open ? styles.collapseOpen : styles.collapseClosed}`}
      aria-hidden={!open}
    >
      <div className={styles.bar}>
        <div className={styles.left}>
          <span className={styles.label}>MULTICAM</span>
          <span className={styles.count}>{count} CÂMERAS</span>
        </div>

        {!isModeLocked && (
          <div className={styles.modeGroup}>
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
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

        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar câmeras" type="button">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
