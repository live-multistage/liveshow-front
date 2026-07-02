'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Camera } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import type { QualityLevel } from './VideoPanel';
import { computeJustifiedRows, pickColumnCount } from './justified-grid';
import styles from './GridView.module.scss';

const GRID_GAP = 2; // px — matches .videoGrid's gap below

interface Props {
  cameras: LiveCamera[];
  onSelectCamera: (cameraId: string) => void;
  globalMuted: boolean;
  audioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
}

// Row-justified mosaic: every active camera at once, each cell sized to its
// real aspect ratio (see justified-grid.ts), columns picked automatically
// (pickColumnCount) instead of a manual layout preset. Clicking a tile
// makes it the main camera and the parent (CameraGrid) switches to
// Main+Rail — there's no more in-place "focused" zoom within the grid.
export function GridView({
  cameras,
  onSelectCamera,
  globalMuted,
  audioCameraId,
  onAudioCameraChange,
  selectedLevel,
  onLevelsReady,
}: Props) {
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  const handleAspectRatioReady = (cameraId: string, ratio: number) => {
    setAspectRatios((prev) => (prev[cameraId] === ratio ? prev : { ...prev, [cameraId]: ratio }));
  };

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

  const cols = pickColumnCount(cameras.length);
  const rows = Math.max(1, Math.ceil(cameras.length / cols));

  const justifiedRows = useMemo(
    () =>
      computeJustifiedRows(
        cameras.map((c) => c.cameraId),
        aspectRatios,
        cols,
        rows,
        containerSize.width,
        containerSize.height,
        GRID_GAP,
      ),
    [cameras, aspectRatios, cols, rows, containerSize],
  );

  const cameraById = useMemo(() => new Map(cameras.map((c) => [c.cameraId, c])), [cameras]);

  const isTileMuted = (cameraId: string) => globalMuted || cameraId !== audioCameraId;
  const handleTileMutedChange = (cameraId: string, wantMuted: boolean) => {
    if (!wantMuted) onAudioCameraChange(cameraId);
  };

  return (
    <div className={styles.videoGrid} ref={gridRef}>
      {justifiedRows.map((row, ri) => (
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
                    onSelect={() => onSelectCamera(camera.cameraId)}
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
      ))}
    </div>
  );
}
