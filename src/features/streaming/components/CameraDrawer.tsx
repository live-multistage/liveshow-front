'use client';

import { X, Square, PanelRight, LayoutGrid, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LiveCamera } from '../types/live.types';
import type { ViewMode } from './camera-layout';
import { DRAWER_W, DRAWER_BOTTOM } from './camera-layout';
import styles from './CameraGrid.module.scss';

const MODES: { id: ViewMode; labelKey: string; icon: typeof Square }[] = [
  { id: 'solo', labelKey: 'viewModeSolo', icon: Square },
  { id: 'main-rail', labelKey: 'viewModeMainRail', icon: PanelRight },
  { id: 'grid', labelKey: 'viewModeGrid', icon: LayoutGrid },
];

interface CameraDrawerProps {
  cameras: LiveCamera[];
  activeCameraIds: string[];
  // NBR 15290 — the Libras window row is shown but never removable.
  librasCameraId: string | null;
  effectiveMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleCamera: (cameraId: string) => void;
  onClose: () => void;
}

// The MULTICAM picker chrome: header (count + view modes + close) and the
// active-camera rows. The inactive-camera video thumbnails are NOT here —
// they are persistent VideoPanels positioned into the drawer by the slot
// layout (role 'strip'), so opening the drawer never reloads a stream.
export function CameraDrawer({
  cameras,
  activeCameraIds,
  librasCameraId,
  effectiveMode,
  onViewModeChange,
  onToggleCamera,
  onClose,
}: CameraDrawerProps) {
  const t = useTranslations('player');

  return (
    <div className={styles.drawer} style={{ width: DRAWER_W, bottom: DRAWER_BOTTOM }}>
      <div className={styles.drawerHeader}>
        <div className={styles.drawerTitle}>
          <span className={styles.drawerLabel}>MULTICAM</span>
          <span className={styles.drawerCount}>{cameras.length}</span>
        </div>
        <div className={styles.drawerActions}>
          {activeCameraIds.length > 1 && (
            <div className={styles.drawerModes}>
              {MODES.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onViewModeChange(id)}
                  title={t(labelKey)}
                  aria-label={t(labelKey)}
                  className={`${styles.modeBtn} ${effectiveMode === id ? styles.modeBtnActive : ''}`}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label={t('closeCameras')}
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div className={styles.drawerRows}>
        {cameras
          .filter((c) => activeCameraIds.includes(c.cameraId))
          .map((c) => {
            // NBR 15290: the Libras window is mandatory — never removable.
            const isLibras = c.cameraId === librasCameraId;
            return (
              <button
                key={c.cameraId}
                type="button"
                className={styles.activeRow}
                disabled={isLibras || activeCameraIds.length <= 1}
                onClick={() => {
                  if (!isLibras && activeCameraIds.length > 1) onToggleCamera(c.cameraId);
                }}
                title={isLibras ? t('librasWindowMandatory') : t('removeFromComposition')}
              >
                <span className={styles.activeRowName}>{c.name}</span>
                {isLibras ? (
                  <span className={styles.activeRowLibras}>LIBRAS</span>
                ) : (
                  <Minus size={14} className={styles.activeRowMinus} />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}
