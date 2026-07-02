'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Square, PanelRight, LayoutGrid } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import { SoloView } from './SoloView';
import { MainRailView } from './MainRailView';
import { GridView } from './GridView';
import styles from './CameraGrid.module.scss';

export type { QualityLevel };
export type ViewMode = 'solo' | 'main-rail' | 'grid';

interface CameraGridProps {
  cameras: LiveCamera[];
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onTitleClick?: () => void;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  globalMuted: boolean;
  onGlobalMutedChange: (muted: boolean) => void;
  audioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  mainCameraId: string | null;
  onMainCameraChange: (cameraId: string) => void;
  activeCameraIds: string[];
  onActiveCameraIdsChange: (ids: string[]) => void;
}

const MODES: { id: ViewMode; label: string; icon: typeof Square }[] = [
  { id: 'solo', label: 'Solo', icon: Square },
  { id: 'main-rail', label: 'Principal + trilha', icon: PanelRight },
  { id: 'grid', label: 'Grade', icon: LayoutGrid },
];

export function CameraGrid({
  cameras,
  title,
  subtitle,
  onBack,
  onTitleClick,
  selectedLevel,
  onLevelsReady,
  globalMuted,
  onGlobalMutedChange,
  audioCameraId,
  onAudioCameraChange,
  viewMode,
  onViewModeChange,
  mainCameraId,
  onMainCameraChange,
  activeCameraIds,
  onActiveCameraIdsChange,
}: CameraGridProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const cameraById = useMemo(() => new Map(cameras.map((c) => [c.cameraId, c])), [cameras]);
  const activeCameras = useMemo(
    () => activeCameraIds.map((id) => cameraById.get(id)).filter((c): c is LiveCamera => !!c),
    [activeCameraIds, cameraById],
  );

  const handleToggleCamera = (cameraId: string) => {
    if (activeCameraIds.includes(cameraId)) {
      if (activeCameraIds.length > 1) onActiveCameraIdsChange(activeCameraIds.filter((id) => id !== cameraId));
    } else {
      onActiveCameraIdsChange([...activeCameraIds, cameraId]);
    }
  };

  const mainCamera = activeCameras.find((c) => c.cameraId === mainCameraId) || activeCameras[0];
  const otherCameras = mainCamera ? activeCameras.filter((c) => c.cameraId !== mainCamera.cameraId) : [];

  const mainMuted = mainCamera ? globalMuted || mainCamera.cameraId !== audioCameraId : true;
  const handleMainMutedChange = (m: boolean) => {
    if (!mainCamera) return;
    if (!m) onAudioCameraChange(mainCamera.cameraId);
    else onGlobalMutedChange(true);
  };

  return (
    <div className={styles.root}>
      <div className={styles.gridMain}>
        <div className={styles.controlsBar}>
          <div className={styles.statusRow}>
            {onBack && (
              <button onClick={onBack} className={styles.backBtn} aria-label="Voltar">
                <ChevronLeft size={20} />
              </button>
            )}
            {title ? (
              <button onClick={onTitleClick} className={styles.titleBtn} title="Ver informações">
                <span className={styles.titleText}>{title}</span>
                {subtitle && <span className={styles.subtitleText}>{subtitle}</span>}
              </button>
            ) : (
              <span className={styles.statusText}>
                {`${activeCameras.length} câmera${activeCameras.length !== 1 ? 's' : ''} ativas`}
              </span>
            )}
          </div>

          {activeCameras.length > 1 && (
            <div className={styles.layoutPicker}>
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onViewModeChange(id)}
                  title={label}
                  aria-label={label}
                  className={`${styles.layoutBtn} ${viewMode === id ? styles.layoutBtnActive : ''}`}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={styles.sidebarToggle}>
            {sidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            <span>{sidebarOpen ? 'Ocultar' : 'Câmeras'}</span>
          </button>
        </div>

        <div className={styles.videoArea}>
          {!mainCamera ? (
            <div className={styles.emptyState}>Nenhuma câmera ativa</div>
          ) : activeCameras.length <= 1 || viewMode === 'solo' ? (
            <SoloView
              camera={mainCamera}
              muted={mainMuted}
              onMutedChange={handleMainMutedChange}
              selectedLevel={selectedLevel}
              onLevelsReady={onLevelsReady}
            />
          ) : viewMode === 'main-rail' ? (
            <MainRailView
              mainCamera={mainCamera}
              otherCameras={otherCameras}
              onSelectMain={onMainCameraChange}
              muted={mainMuted}
              onMutedChange={handleMainMutedChange}
              selectedLevel={selectedLevel}
              onLevelsReady={onLevelsReady}
            />
          ) : (
            <GridView
              cameras={activeCameras}
              onSelectCamera={(id) => {
                onMainCameraChange(id);
                onViewModeChange('main-rail');
              }}
              globalMuted={globalMuted}
              audioCameraId={audioCameraId}
              onAudioCameraChange={onAudioCameraChange}
              selectedLevel={selectedLevel}
              onLevelsReady={onLevelsReady}
            />
          )}
        </div>
      </div>

      {sidebarOpen && <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />}

      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div>
            <p className={styles.sidebarHeaderTitle}>SELECIONAR CÂMERAS</p>
            <p className={styles.sidebarHeaderMeta}>
              {activeCameraIds.length} de {cameras.length} ativas
            </p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className={styles.sidebarClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className={styles.sidebarList}>
          {cameras.map((camera) => {
            const isActive = activeCameraIds.includes(camera.cameraId);
            return (
              <button
                key={camera.cameraId}
                onClick={() => handleToggleCamera(camera.cameraId)}
                className={`${styles.cameraBtn} ${isActive ? styles.cameraBtnActive : styles.cameraBtnCanAdd}`}
              >
                <div className={styles.cameraThumb}>
                  {isActive && (
                    <div className={styles.cameraActiveIndicator}>
                      <span className={styles.cameraActiveDot} />
                    </div>
                  )}
                </div>
                <div className={styles.cameraInfo}>
                  <p className={`${styles.cameraName} ${isActive ? styles.cameraNameActive : ''}`}>
                    {camera.name}
                  </p>
                  <p className={styles.cameraAngle}>{camera.slug}</p>
                </div>
                {isActive && <span className={styles.cameraStatusDot} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
