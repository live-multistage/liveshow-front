'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import type { QualityLevel } from './VideoPanel';
import { computeJustifiedRows } from './justified-grid';
import styles from './CameraGrid.module.scss';

const GRID_GAP = 2; // px — matches .videoGrid's gap in CameraGrid.module.scss

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

export type { QualityLevel };

interface CameraGridProps {
  cameras: LiveCamera[];
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onTitleClick?: () => void;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  // Master on/off switch (toolbar volume icon).
  globalMuted: boolean;
  onGlobalMutedChange: (muted: boolean) => void;
  // Which single camera's audio plays while unmuted (toolbar cog menu) —
  // every other tile stays silent regardless of globalMuted, so audio from
  // multiple simultaneous tiles never overlaps.
  audioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
}

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
}: CameraGridProps) {
  const [layoutId, setLayoutId] = useState(() => layoutForCount(cameras.length).id);
  const [activeCameras, setActiveCameras] = useState<string[]>(() =>
    cameras.slice(0, layoutForCount(cameras.length).max).map((c) => c.cameraId),
  );
  const [focusedCamera, setFocusedCamera] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const handleAspectRatioReady = useCallback((cameraId: string, ratio: number) => {
    setAspectRatios((prev) => (prev[cameraId] === ratio ? prev : { ...prev, [cameraId]: ratio }));
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      } else if (layout.max === 1) {
        // 1x1: replace instead of add
        setActiveCameras([cameraId]);
      }
    },
    [activeCameras, layout.max, focusedCamera],
  );

  const displayCameras = focusedCamera
    ? cameras.filter((c) => c.cameraId === focusedCamera)
    : cameras.filter((c) => activeCameras.includes(c.cameraId)).slice(0, layout.max);

  const cameraById = useMemo(
    () => new Map(cameras.map((c) => [c.cameraId, c])),
    [cameras],
  );

  // A tile plays audio only if the master switch is on AND it's the chosen
  // audio camera. Clicking a tile's own mute icon to unmute it makes it the
  // audio camera (that's the only way for a non-selected tile to un-silence
  // itself); muting the currently-selected one just flips the master switch.
  const isTileMuted = (cameraId: string) => globalMuted || cameraId !== audioCameraId;
  const handleTileMutedChange = (cameraId: string, wantMuted: boolean) => {
    if (!wantMuted) {
      onAudioCameraChange(cameraId);
      onGlobalMutedChange(false);
    } else if (cameraId === audioCameraId) {
      onGlobalMutedChange(true);
    }
  };

  // Row-justified layout: each row's height is picked so its cells (at
  // their real aspect ratio) exactly fill the container width, then capped
  // to that row's even share of the container height — guarantees the grid
  // never overflows vertically, even with mixed 16:9/9:16 cameras. Skipped
  // entirely in focused mode (single tile just fills the frame).
  const justifiedRows = useMemo(
    () =>
      focusedCamera
        ? []
        : computeJustifiedRows(
            displayCameras.map((c) => c.cameraId),
            aspectRatios,
            layout.cols,
            layout.rows,
            containerSize.width,
            containerSize.height,
            GRID_GAP,
          ),
    [focusedCamera, displayCameras, aspectRatios, layout.cols, layout.rows, containerSize],
  );

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

        <div className={styles.videoGrid} ref={gridRef}>
          {focusedCamera ? (
            displayCameras.map((camera) => (
              <div key={camera.cameraId} className={styles.focusedCell}>
                <VideoPanel
                  camera={camera}
                  isFocused
                  onSelect={() => handleCameraSelect(camera.cameraId)}
                  showLabel
                  selectedLevel={selectedLevel}
                  onLevelsReady={onLevelsReady}
                  muted={isTileMuted(camera.cameraId)}
                  onMutedChange={(m) => handleTileMutedChange(camera.cameraId, m)}
                />
              </div>
            ))
          ) : (
            justifiedRows.map((row, ri) => (
              <div
                key={ri}
                className={styles.videoRow}
                style={{ height: row.height, width: row.width, gap: GRID_GAP }}
              >
                {row.cells.map((cell, ci) => {
                  const camera = cell.cameraId ? cameraById.get(cell.cameraId) : undefined;
                  if (camera) {
                    return (
                      <div key={cell.cameraId} style={{ width: cell.width, height: cell.height }}>
                        <VideoPanel
                          camera={camera}
                          onSelect={() => handleCameraSelect(camera.cameraId)}
                          showLabel
                          selectedLevel={selectedLevel}
                          onLevelsReady={onLevelsReady}
                          onAspectRatioReady={handleAspectRatioReady}
                          muted={isTileMuted(camera.cameraId)}
                          onMutedChange={(m) => handleTileMutedChange(camera.cameraId, m)}
                        />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`empty-${ri}-${ci}`}
                      className={styles.emptySlot}
                      style={{ width: cell.width, height: cell.height }}
                    >
                      <div className={styles.emptySlotIcon}>
                        <Camera size={20} />
                        <p className={styles.emptySlotText}>Slot vazio</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
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
            const canSwitch = !isActive && layout.max === 1;
            return (
              <button
                key={camera.cameraId}
                onClick={() => handleAddCamera(camera.cameraId)}
                disabled={!isActive && !canAdd && !canSwitch}
                className={`${styles.cameraBtn} ${
                  isActive ? styles.cameraBtnActive : (canAdd || canSwitch) ? styles.cameraBtnCanAdd : styles.cameraBtnDisabled
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
