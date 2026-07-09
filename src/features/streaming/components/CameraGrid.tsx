'use client';

import { useMemo } from 'react';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import { MainRailView } from './MainRailView';
import { GridView } from './GridView';
import styles from './CameraGrid.module.scss';

export type { QualityLevel };
export type ViewMode = 'solo' | 'main-rail' | 'grid';

interface CameraGridProps {
  cameras: LiveCamera[];
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  globalMuted: boolean;
  onGlobalMutedChange: (muted: boolean) => void;
  audioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  volume: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  mainCameraId: string | null;
  onMainCameraChange: (cameraId: string) => void;
  activeCameraIds: string[];
  mode?: 'live' | 'replay';
  // Replay only — see VideoPanel's own prop docs. Applied to every active
  // camera; onProgress/onEnded only fire from the current main camera.
  paused?: boolean;
  seekCommand?: { time: number; token: number } | null;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

// Pure view-mode dispatcher now — camera selection lives in CameraStrip,
// stage/chat/share chrome lives in Header, both siblings of this component
// in LivePlayer. This component only decides which of Solo/Main+Rail/Grid
// to render for the currently active cameras.
export function CameraGrid({
  cameras,
  selectedLevel,
  onLevelsReady,
  globalMuted,
  onGlobalMutedChange,
  audioCameraId,
  onAudioCameraChange,
  volume,
  viewMode,
  onViewModeChange,
  mainCameraId,
  onMainCameraChange,
  activeCameraIds,
  mode = 'live',
  paused,
  seekCommand,
  onProgress,
  onEnded,
}: CameraGridProps) {
  const cameraById = useMemo(() => new Map(cameras.map((c) => [c.cameraId, c])), [cameras]);
  const activeCameras = useMemo(
    () => activeCameraIds.map((id) => cameraById.get(id)).filter((c): c is LiveCamera => !!c),
    [activeCameraIds, cameraById],
  );

  const mainCamera = activeCameras.find((c) => c.cameraId === mainCameraId) || activeCameras[0];

  // Only 1 active camera forces Solo — CameraStrip hides the multiview
  // picker in that same case (its own isModeLocked prop).
  const effectiveMode: ViewMode = activeCameras.length <= 1 ? 'solo' : viewMode;

  // Solo and Main+Rail both render through MainRailView so the main
  // camera's VideoPanel never remounts when effectiveMode flips between the
  // two (e.g. the moment a 2nd camera gets added) — only whether the pip/rail
  // siblings appear changes. Solo means "hide the others", so it always
  // passes an empty otherCameras, whether Solo is forced (<=1 active) or
  // explicitly picked via CameraStrip's mode picker with 2+ active.
  const otherCameras =
    mainCamera && effectiveMode !== 'solo'
      ? activeCameras.filter((c) => c.cameraId !== mainCamera.cameraId)
      : [];

  const mainMuted = mainCamera ? globalMuted || mainCamera.cameraId !== audioCameraId : true;
  const handleMainMutedChange = (m: boolean) => {
    if (!mainCamera) return;
    if (!m) onAudioCameraChange(mainCamera.cameraId);
    else onGlobalMutedChange(true);
  };

  return (
    <div className={styles.videoArea}>
      {!mainCamera ? (
        <div className={styles.emptyState}>Nenhuma câmera ativa</div>
      ) : effectiveMode !== 'grid' ? (
        <MainRailView
          mainCamera={mainCamera}
          otherCameras={otherCameras}
          onSelectMain={onMainCameraChange}
          muted={mainMuted}
          onMutedChange={handleMainMutedChange}
          volume={volume}
          selectedLevel={selectedLevel}
          onLevelsReady={onLevelsReady}
          mode={mode}
          paused={paused}
          seekCommand={seekCommand}
          onProgress={onProgress}
          onEnded={onEnded}
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
          volume={volume}
          selectedLevel={selectedLevel}
          onLevelsReady={onLevelsReady}
          mode={mode}
          paused={paused}
          seekCommand={seekCommand}
          timeSourceCameraId={mainCamera?.cameraId ?? null}
          onProgress={onProgress}
          onEnded={onEnded}
        />
      )}
    </div>
  );
}
