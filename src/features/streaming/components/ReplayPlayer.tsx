'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Play, Video } from 'lucide-react';
import type { ReplayCameraPlayback, LiveCamera } from '../types/live.types';
import { CameraGrid } from './CameraGrid';
import type { QualityLevel, ViewMode } from './CameraGrid';
import { CameraStrip } from './CameraStrip';
import { ReplayTransportBar } from './ReplayTransportBar';
import styles from './ReplayPlayer.module.scss';

interface ReplayPlayerProps {
  cameras: ReplayCameraPlayback[];
  title: string;
  eventId: string;
}

// Replay's grid/camera-switching UX mirrors LivePlayer's (same
// CameraGrid/CameraStrip components, mode="replay"), drops what's live-only
// (viewer tracking, chat), and adds its own ReplayTransportBar for
// play/pause/seek — no native <video controls> (see VideoPanel's mode prop),
// matching the live player's custom-chrome look exactly.
//
// paused/seekCommand are applied to every active camera's <video> (see
// VideoPanel), so switching the main camera mid-playback doesn't leave a
// background tile still running or arbitrarily far out of sync — but each
// camera is still its own independent VOD timeline underneath (no frame-
// accurate cross-camera sync), a real, harder problem deliberately left for
// later.
export function ReplayPlayer({ cameras: rawCameras, title, eventId }: ReplayPlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Starts paused: a VOD stream autoplaying with sound the moment the page
  // loads (no direct user gesture on this element) is exactly what browser
  // autoplay policies block anyway — same big-play-button pattern as any
  // VOD player.
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekCommand, setSeekCommand] = useState<{ time: number; token: number } | null>(null);

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

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    setSeekCommand({ time, token: Date.now() });
  };

  const handleEnded = () => setPaused(true);

  const toggleFullscreen = () => {
    if (!isFullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(!isFullscreen);
  };

  const handleTogglePip = async () => {
    const video = containerRef.current?.querySelector<HTMLVideoElement>('video[data-focused="true"]');
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // PiP unsupported or blocked by the browser — no-op.
    }
  };

  const activeLevel = levels.find((l) => l.index === currentLevel);
  const qualityLabel = currentLevel === -1 ? 'Auto' : activeLevel ? `${activeLevel.height}p` : 'Auto';

  const handleAudioCameraChange = (id: string) => {
    setAudioCameraId(id);
    setGlobalMuted(false);
  };

  const effectiveAudioCameraId =
    audioCameraId && cameras.some((c) => c.cameraId === audioCameraId) ? audioCameraId : (cameras[0]?.cameraId ?? null);

  if (playableCameras.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2>{title}</h2>
        <p>Replay ainda não disponível para este evento.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.player}>
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
            audioCameraId={effectiveAudioCameraId}
            onAudioCameraChange={handleAudioCameraChange}
            volume={volume}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            mainCameraId={effectiveMainCameraId}
            onMainCameraChange={setMainCameraId}
            activeCameraIds={activeCameraIds}
            mode="replay"
            paused={paused}
            seekCommand={seekCommand}
            onProgress={(t, d) => {
              setCurrentTime(t);
              setDuration(d);
            }}
            onEnded={handleEnded}
          />
        </div>

        {paused && (
          <button className={styles.centerPlayOverlay} onClick={() => setPaused(false)} aria-label="Reproduzir">
            <span className={styles.centerPlayBtn}>
              <Play size={28} fill="currentColor" />
            </span>
          </button>
        )}
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
          paused={paused}
          seekCommand={seekCommand}
        />

        <ReplayTransportBar
          paused={paused}
          onTogglePlay={() => setPaused((p) => !p)}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          globalMuted={globalMuted}
          onToggleMute={() => setGlobalMuted((m) => !m)}
          volume={volume}
          onVolumeChange={setVolume}
          audioCameras={cameras}
          effectiveAudioCameraId={effectiveAudioCameraId}
          onAudioCameraChange={handleAudioCameraChange}
          levels={levels}
          currentLevel={currentLevel}
          qualityLabel={qualityLabel}
          onSelectLevel={setCurrentLevel}
          onTogglePip={handleTogglePip}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
}
