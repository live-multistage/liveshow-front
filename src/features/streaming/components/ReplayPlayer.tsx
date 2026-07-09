'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Video } from 'lucide-react';
import type { ReplayCameraPlayback, LiveCamera } from '../types/live.types';
import { CameraGrid } from './CameraGrid';
import type { QualityLevel, ViewMode } from './CameraGrid';
import { CameraStrip } from './CameraStrip';
import styles from './ReplayPlayer.module.scss';

interface ReplayPlayerProps {
  cameras: ReplayCameraPlayback[];
  title: string;
  eventId: string;
}

// Replay's grid/camera-switching UX intentionally mirrors LivePlayer's (same
// CameraGrid/CameraStrip components, mode="replay"), but drops what's
// live-only: viewer tracking, chat, TransportBar. A VOD HLS stream gets
// play/pause/seek/volume for free from the browser's native <video controls>
// once VideoPanel renders them (see VideoPanel's mode prop) — no custom
// transport bar needed.
//
// Known scope cut: switching the main camera does NOT carry over playback
// position — each camera's <video> is its own independent VOD timeline, not
// synced to the others. Multi-camera synchronized scrubbing is a real,
// harder problem deliberately left for later.
export function ReplayPlayer({ cameras: rawCameras, title, eventId }: ReplayPlayerProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('main-rail');
  const [mainCameraId, setMainCameraId] = useState<string | null>(null);
  const [activeCameraIds, setActiveCameraIds] = useState<string[]>(() => {
    const first = rawCameras.find((c) => c.replayPath !== null);
    return first ? [first.cameraId] : [];
  });
  const [cameraStripOpen, setCameraStripOpen] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [audioCameraId, setAudioCameraId] = useState<string | null>(null);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  // CameraGrid/VideoPanel consume LiveCamera (manifestPath), not
  // ReplayCameraPlayback (replayPath) — same shape, different field name for
  // the two playback kinds. Map once here rather than renaming the field
  // throughout the shared grid components.
  const cameras: LiveCamera[] = useMemo(
    () =>
      rawCameras.map((c) => ({
        cameraId: c.cameraId,
        name: c.name,
        slug: c.slug,
        priority: c.priority,
        manifestPath: c.replayPath,
      })),
    [rawCameras],
  );

  const playableCameras = cameras.filter((c) => c.manifestPath !== null);
  const effectiveMainCameraId =
    mainCameraId && activeCameraIds.includes(mainCameraId) ? mainCameraId : (activeCameraIds[0] ?? null);

  const handleToggleCamera = (cameraId: string) => {
    if (activeCameraIds.includes(cameraId)) {
      if (activeCameraIds.length > 1) setActiveCameraIds(activeCameraIds.filter((id) => id !== cameraId));
    } else {
      setActiveCameraIds([...activeCameraIds, cameraId]);
    }
  };

  if (playableCameras.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2>{title}</h2>
        <p>Replay ainda não disponível para este evento.</p>
      </div>
    );
  }

  return (
    <div className={styles.player}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push(`/events/${eventId}`)} aria-label="Voltar">
          <ChevronLeft size={16} />
        </button>
        <div className={styles.titleGroup}>
          <span className={styles.title}>{title}</span>
          <span className={styles.replayBadge}>REPLAY</span>
        </div>
        {cameras.length > 1 && (
          <button className={styles.cameraToggleBtn} onClick={() => setCameraStripOpen((o) => !o)} title="Alternar câmeras">
            <Video size={13} />
            Câmeras
          </button>
        )}
      </header>

      <div className={styles.main}>
        <div className={styles.gridArea}>
          <CameraGrid
            cameras={cameras}
            selectedLevel={currentLevel}
            onLevelsReady={setLevels}
            globalMuted={globalMuted}
            onGlobalMutedChange={setGlobalMuted}
            audioCameraId={audioCameraId}
            onAudioCameraChange={setAudioCameraId}
            volume={volume}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            mainCameraId={effectiveMainCameraId}
            onMainCameraChange={setMainCameraId}
            activeCameraIds={activeCameraIds}
            mode="replay"
          />
        </div>
      </div>

      <div className={styles.bottomStack}>
        <CameraStrip
          cameras={cameras}
          activeCameraIds={activeCameraIds}
          mainCameraId={effectiveMainCameraId}
          onToggleCamera={handleToggleCamera}
          onSelectMain={setMainCameraId}
          isModeLocked={activeCameraIds.length <= 1}
          effectiveMode={viewMode}
          onViewModeChange={setViewMode}
          open={cameraStripOpen}
          onClose={() => setCameraStripOpen(false)}
          mode="replay"
        />
      </div>
    </div>
  );
}
