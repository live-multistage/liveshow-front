import { useState, useCallback } from 'react';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Camera as CameraType } from '@/features/events/types/show';
import { GRID_LAYOUTS } from '@/features/events/types/show';
import { VideoPanel } from './VideoPanel';
import styles from './CameraGrid.module.scss';

interface CameraGridProps {
  cameras: CameraType[];
  isReplay?: boolean;
  replayTime?: number;
}

export function CameraGrid({ cameras, isReplay = false, replayTime = 0 }: CameraGridProps) {
  const [layoutId, setLayoutId] = useState('2x2');
  const [activeCameras, setActiveCameras] = useState<string[]>(() => cameras.slice(0, 4).map((c) => c.id));
  const [focusedCamera, setFocusedCamera] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const layout = GRID_LAYOUTS.find((l) => l.id === layoutId) || GRID_LAYOUTS[2];

  const handleLayoutChange = useCallback(
    (newLayoutId: string) => {
      const newLayout = GRID_LAYOUTS.find((l) => l.id === newLayoutId);
      if (!newLayout) return;
      setLayoutId(newLayoutId);
      setFocusedCamera(null);
      const needed = newLayout.max;
      if (activeCameras.length < needed) {
        const remaining = cameras.filter((c) => !activeCameras.includes(c.id));
        const toAdd = remaining.slice(0, needed - activeCameras.length).map((c) => c.id);
        setActiveCameras([...activeCameras, ...toAdd]);
      } else if (activeCameras.length > needed) {
        setActiveCameras(activeCameras.slice(0, needed));
      }
    },
    [activeCameras, cameras]
  );

  const handleCameraSelect = useCallback(
    (cameraId: string) => {
      setFocusedCamera(focusedCamera === cameraId ? null : cameraId);
    },
    [focusedCamera]
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
    [activeCameras, layout.max, focusedCamera]
  );

  const displayCameras = focusedCamera
    ? cameras.filter((c) => c.id === focusedCamera)
    : cameras.filter((c) => activeCameras.includes(c.id)).slice(0, layout.max);

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
            <Camera size={16} />
            <span className={styles.statusText}>
              {focusedCamera
                ? 'Câmera Ampliada'
                : `${displayCameras.length} câmera${displayCameras.length !== 1 ? 's' : ''} ativas`}
            </span>
            {focusedCamera && (
              <button onClick={() => setFocusedCamera(null)} className={styles.backLink}>
                Voltar ao grid
              </button>
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
              key={camera.id}
              camera={camera}
              isFocused={focusedCamera === camera.id}
              onSelect={() => handleCameraSelect(camera.id)}
              showLabel
              isReplay={isReplay}
              replayTime={replayTime}
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

      {sidebarOpen && (
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <p className={styles.sidebarHeaderTitle}>SELECIONAR CÂMERAS</p>
            <p className={styles.sidebarHeaderMeta}>Máx. {layout.max} no layout {layoutId}</p>
          </div>
          <div className={styles.sidebarList}>
            {cameras.map((camera) => {
              const isActive = activeCameras.includes(camera.id);
              const canAdd = !isActive && activeCameras.length < layout.max;
              return (
                <button
                  key={camera.id}
                  onClick={() => handleAddCamera(camera.id)}
                  disabled={!isActive && !canAdd}
                  className={`${styles.cameraBtn} ${
                    isActive ? styles.cameraBtnActive :
                    canAdd  ? styles.cameraBtnCanAdd :
                              styles.cameraBtnDisabled
                  }`}
                >
                  <div
                    className={styles.cameraThumb}
                    style={{ background: `linear-gradient(135deg, ${camera.gradient})` }}
                  >
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
                    <p className={styles.cameraAngle}>{camera.angle}</p>
                  </div>
                  {isActive && <span className={styles.cameraStatusDot} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
