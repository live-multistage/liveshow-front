'use client';

import { useState, useEffect, useCallback } from 'react';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import styles from './CameraGrid.module.scss';

const GRID_LAYOUTS = [
  { id: '1x1', label: '1 Câmera', cols: 1, rows: 1, max: 1 },
  { id: '1x2', label: '2 Câmeras', cols: 2, rows: 1, max: 2 },
  { id: '2x2', label: '4 Câmeras', cols: 2, rows: 2, max: 4 },
  { id: '3x3', label: '9 Câmeras', cols: 3, rows: 3, max: 9 },
];

function layoutForCount(n: number) {
  if (n <= 1) return GRID_LAYOUTS[0];
  if (n === 2) return GRID_LAYOUTS[1];
  if (n <= 4) return GRID_LAYOUTS[2];
  return GRID_LAYOUTS[3];
}

interface CameraGridProps {
  cameras: LiveCamera[];
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onTitleClick?: () => void;
}

export function CameraGrid({
  cameras,
  title,
  subtitle,
  onBack,
  onTitleClick,
}: CameraGridProps) {
  const [layoutId, setLayoutId] = useState(() => layoutForCount(cameras.length).id);
  const [activeCameras, setActiveCameras] = useState<string[]>(() =>
    cameras.slice(0, layoutForCount(cameras.length).max).map((c) => c.cameraId),
  );
  const [focusedCamera, setFocusedCamera] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const cameraKey = cameras.map((c) => c.cameraId).sort().join(',');
  useEffect(() => {
    const auto = layoutForCount(cameras.length);
    setLayoutId(auto.id);
    setActiveCameras(cameras.slice(0, auto.max).map((c) => c.cameraId));
    setFocusedCamera((cur) => (cur && cameras.some((c) => c.cameraId === cur) ? cur : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraKey]);

  const layout = GRID_LAYOUTS.find((l) => l.id === layoutId) || GRID_LAYOUTS[2];

  const handleLayoutChange = useCallback(
    (newLayoutId: string) => {
      const newLayout = GRID_LAYOUTS.find((l) => l.id === newLayoutId);
      if (!newLayout) return;
      setLayoutId(newLayoutId);
      setFocusedCamera(null);
      const needed = newLayout.max;
      if (activeCameras.length < needed) {
        const remaining = cameras.filter((c) => !activeCameras.includes(c.cameraId));
        const toAdd = remaining.slice(0, needed - activeCameras.length).map((c) => c.cameraId);
        setActiveCameras([...activeCameras, ...toAdd]);
      } else if (activeCameras.length > needed) {
        setActiveCameras(activeCameras.slice(0, needed));
      }
    },
    [activeCameras, cameras],
  );

  const handleCameraSelect = useCallback(
    (cameraId: string) => {
      setFocusedCamera((cur) => (cur === cameraId ? null : cameraId));
    },
    [],
  );

  const handleAddCamera = useCallback(
    (cameraId: string) => {
      if (activeCameras.includes(cameraId)) {
        if (activeCameras.length > 1) {
          setActiveCameras(activeCameras.filter((id) => id !== cameraId));
          if (focusedCamera === cameraId) setFocusedCamera(null);
        }
      } else if (activeCameras.length < layout.max) {
        setActiveCameras([...activeCameras, cameraId]);
      }
    },
    [activeCameras, layout.max, focusedCamera],
  );

  const displayCameras = focusedCamera
    ? cameras.filter((c) => c.cameraId === focusedCamera)
    : cameras.filter((c) => activeCameras.includes(c.cameraId)).slice(0, layout.max);

  const gridStyle = focusedCamera
    ? { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }
    : {
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
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
            {focusedCamera ? (
              <>
                <span className={styles.statusText}>Câmera Ampliada</span>
                <button onClick={() => setFocusedCamera(null)} className={styles.backLink}>
                  Voltar ao grid
                </button>
              </>
            ) : title ? (
              <button onClick={onTitleClick} className={styles.titleBtn} title="Ver informações">
                <span className={styles.titleText}>{title}</span>
                {subtitle && <span className={styles.subtitleText}>{subtitle}</span>}
              </button>
            ) : (
              <span className={styles.statusText}>
                {`${displayCameras.length} câmera${displayCameras.length !== 1 ? 's' : ''} ativas`}
              </span>
            )}
          </div>

          {!focusedCamera && (
            <div className={styles.layoutPicker}>
              {GRID_LAYOUTS.map((l) => {
                const isDisabled = l.max > cameras.length;
                return (
                  <button
                    key={l.id}
                    disabled={isDisabled}
                    onClick={() => handleLayoutChange(l.id)}
                    title={l.label}
                    className={`${styles.layoutBtn} ${layoutId === l.id ? styles.layoutBtnActive : ''}`}
                  >
                    {l.id}
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={styles.sidebarToggle}>
            {sidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            <span>{sidebarOpen ? 'Ocultar' : 'Câmeras'}</span>
          </button>
        </div>

        <div className={styles.videoGrid} style={gridStyle}>
          {displayCameras.map((camera) => (
            <VideoPanel
              key={camera.cameraId}
              camera={camera}
              isFocused={focusedCamera === camera.cameraId}
              onSelect={() => handleCameraSelect(camera.cameraId)}
              showLabel
            />
          ))}
          {!focusedCamera &&
            Array.from({ length: Math.max(0, layout.max - displayCameras.length) }).map((_, i) => (
              <div key={`empty-${i}`} className={styles.emptySlot}>
                <div className={styles.emptySlotIcon}>
                  <Camera size={20} />
                  <p className={styles.emptySlotText}>Slot vazio</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {sidebarOpen && <div className={styles.backdrop} onClick={() => setSidebarOpen(false)} />}

      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div>
            <p className={styles.sidebarHeaderTitle}>SELECIONAR CÂMERAS</p>
            <p className={styles.sidebarHeaderMeta}>Máx. {layout.max} no layout {layoutId}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className={styles.sidebarClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className={styles.sidebarList}>
          {cameras.map((camera) => {
            const isActive = activeCameras.includes(camera.cameraId);
            const canAdd = !isActive && activeCameras.length < layout.max;
            return (
              <button
                key={camera.cameraId}
                onClick={() => handleAddCamera(camera.cameraId)}
                disabled={!isActive && !canAdd}
                className={`${styles.cameraBtn} ${
                  isActive ? styles.cameraBtnActive : canAdd ? styles.cameraBtnCanAdd : styles.cameraBtnDisabled
                }`}
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
