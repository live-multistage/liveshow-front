'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Play, Video } from 'lucide-react';
import { ReportButton } from '@/features/reports';
import type { ReplayCameraPlayback, ReplayEventTimeline, LiveCamera } from '../types/live.types';
import { CameraGrid, DRAWER_W } from './CameraGrid';
import type { QualityLevel, ViewMode } from './CameraGrid';
import { SessionWatermark } from './SessionWatermark';
import { PauseAdTakeover } from '@/features/advertisements/components/PauseAdTakeover';
import { ReplayTransportBar } from './ReplayTransportBar';
import { usePlayerHotkeys, VOLUME_STEP, clampVolume } from '../hooks/use-player-hotkeys';
import { localToAbsolute } from '../utils/replay-timeline';
import { useTrackPlaybackProgress, usePlaybackProgressQuery } from '@/features/playback-progress';
import { useAuth } from '@/features/account/hooks/use-auth';
import styles from './ReplayPlayer.module.scss';

interface ReplayPlayerProps {
  cameras: ReplayCameraPlayback[];
  // NBR 15290 — camera pinned as the mandatory Libras window (null if none/VOD).
  librasCameraId?: string | null;
  title: string;
  eventId: string;
  // The event's absolute replay timeline (domain every camera's coverage maps
  // onto). Null when no camera has any replay — orchestration resolves this
  // from the API; we only render the empty state for it.
  timeline: ReplayEventTimeline | null;
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
export function ReplayPlayer({ cameras: rawCameras, librasCameraId = null, title, eventId, timeline }: ReplayPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('main-rail');
  const [mainCameraId, setMainCameraId] = useState<string | null>(null);
  // The Libras window (if this event has one) is always active and never removable.
  const librasInSet = librasCameraId && rawCameras.some((c) => c.cameraId === librasCameraId)
    ? librasCameraId
    : null;
  const [activeCameraIds, setActiveCameraIds] = useState<string[]>(() => {
    const first = rawCameras.find((c) => c.replayPath !== null);
    const initial = first ? [first.cameraId] : [];
    if (librasInSet && !initial.includes(librasInSet)) initial.push(librasInSet);
    return initial;
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
  // Drives the video-shrinks-into-a-card takeover: fed by PauseAdTakeover's
  // onVisibleChange, which fires false on resume/unmount so this can never
  // get stuck shrunk without an ad actually on screen.
  const [pauseAdVisible, setPauseAdVisible] = useState(false);
  // The absolute instant (ms, event timeline) playback is currently at — NOT
  // a camera's local media time. Each camera's <video> only knows its own
  // local seconds; positionMs is what lets cameras that joined the event at
  // different times still agree on "now" (see replay-timeline.ts).
  const [positionMs, setPositionMs] = useState(0);
  // seekCommand.time is the absolute instant (ms) — same domain as
  // positionMs, NOT a camera-local offset. The token still exists so
  // re-seeking the same instant twice in a row (e.g. resume) still applies.
  const [seekCommand, setSeekCommand] = useState<{ time: number; token: number } | null>(null);

  const { isLoggedIn } = useAuth();
  const { report } = useTrackPlaybackProgress({ eventId, enabled: isLoggedIn });
  // Deslogado não tem onde guardar posição, então nem busca.
  const { data: progress } = usePlaybackProgressQuery({ enabled: isLoggedIn });

  // Assim que a timeline chega, a posição parte do início do evento — só uma
  // vez, pra não pisar num seek que já tenha rolado (ex.: resume abaixo).
  const timelineSeeded = useRef(false);
  useEffect(() => {
    if (!timeline || timelineSeeded.current) return;
    timelineSeeded.current = true;
    setPositionMs(timeline.startsAtMs);
  }, [timeline]);

  // Retoma UMA vez por montagem. Sem a trava, uma revalidação da query no meio
  // da reprodução mandaria o espectador de volta ao ponto salvo — que a essa
  // altura já ficou para trás. Progresso é gravado em segundos relativos ao
  // início da timeline (linhas já existem nesse formato — ver report abaixo).
  const resumeApplied = useRef(false);
  useEffect(() => {
    if (resumeApplied.current || !progress || !timeline) return;
    const saved = progress.find((p) => p.eventId === eventId);
    resumeApplied.current = true;
    // resumeSeconds já vem 0 quando o evento foi concluído ou quando a posição
    // é pequena demais — a regra é do servidor, não recalcular aqui.
    if (!saved || saved.resumeSeconds <= 0) return;
    const resumeAbsoluteMs = timeline.startsAtMs + saved.resumeSeconds * 1000;
    setSeekCommand({ time: resumeAbsoluteMs, token: Date.now() });
    setPositionMs(resumeAbsoluteMs);
  }, [progress, eventId, timeline]);

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
        // Sem repassar aqui, a cobertura morre no mapeamento e todo painel
        // volta a tratar o instante absoluto como se fosse tempo local dele.
        coverage: c.coverage,
        llPath: null, // LL-HLS is a live-only mode; replay always plays the standard ABR ladder
      })),
    [rawCameras],
  );

  const playableCameras = cameras.filter((c) => c.manifestPath !== null);
  const effectiveMainCameraId =
    mainCameraId && activeCameraIds.includes(mainCameraId) ? mainCameraId : (activeCameraIds[0] ?? null);
  // CameraGrid only reports progress for the PRIMARY panel, and it reports in
  // that camera's own local seconds — its coverage is what converts that back
  // to the absolute instant everything else (positionMs, seekCommand) is in.
  const primaryCoverage =
    rawCameras.find((c) => c.cameraId === effectiveMainCameraId)?.coverage ?? [];

  const handleToggleCamera = (cameraId: string) => {
    // The Libras window is mandatory (NBR 15290) — never removable.
    if (cameraId === librasInSet) return;
    if (activeCameraIds.includes(cameraId)) {
      if (activeCameraIds.length > 1) setActiveCameraIds(activeCameraIds.filter((id) => id !== cameraId));
    } else {
      setActiveCameraIds([...activeCameraIds, cameraId]);
    }
  };

  // `absoluteMs` is the event-timeline instant (see positionMs comment above),
  // not a camera-local offset — the transport bar's domain is the timeline.
  const handleSeek = (absoluteMs: number) => {
    setPositionMs(absoluteMs);
    setSeekCommand({ time: absoluteMs, token: Date.now() });
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

  usePlayerHotkeys({
    onToggleFullscreen: toggleFullscreen,
    onToggleCameraPanel: () => { if (cameras.length > 1) setCameraStripOpen((o) => !o); },
    onToggleMute: () => setGlobalMuted((m) => !m),
    onTogglePlay: () => setPaused((p) => !p),
    onVolumeUp: () => { setVolume((v) => clampVolume(v + VOLUME_STEP)); setGlobalMuted(false); },
    onVolumeDown: () => setVolume((v) => clampVolume(v - VOLUME_STEP)),
  });

  // ponytail: `!timeline` derruba o replay de VOD junto. O backend devolve
  // timeline null para VOD (asset único, sem costura de pacotes), então um VOD
  // com vídeo pronto cai aqui e anuncia "indisponível" — regressão conhecida,
  // adiada de propósito. Conserto: dar ao VOD uma timeline derivada da duração
  // do asset, mantendo um contrato só, em vez de abrir exceção neste guard.
  if (playableCameras.length === 0 || !timeline) {
    return (
      <div className={styles.emptyState}>
        <h2>{title}</h2>
        <p>Replay ainda não disponível para este evento.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.player}>
      <header
        className={`${styles.header} ${pauseAdVisible ? styles.headerHidden : ''}`}
        // Constrain the bar's own box to stop before the camera drawer's
        // DRAWER_W-wide strip — padding alone left the (transparent, but
        // still hit-testable) right edge of the bar sitting over the
        // drawer's close/mode buttons and swallowing their clicks.
        style={cameraStripOpen ? { right: DRAWER_W } : undefined}
      >
        <Link href={`/events/${eventId}`} className={styles.backBtn} aria-label="Voltar">
          <ChevronLeft size={16} />
        </Link>
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
        <ReportButton eventId={eventId} className={styles.iconBtn} iconOnly />
      </header>

      <div className={styles.main}>
        <div className={styles.gridArea}>
          <PauseAdTakeover
            paused={paused}
            onResume={() => setPaused(false)}
            onVisibleChange={setPauseAdVisible}
          />

          <div className={`${styles.stageArea} ${pauseAdVisible ? styles.stageAreaShrunk : ''}`}>
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
              librasCameraId={librasInSet}
              pickerOpen={cameraStripOpen}
              onToggleCamera={handleToggleCamera}
              onClosePicker={() => setCameraStripOpen(false)}
              mode="replay"
              paused={paused}
              // Sem isto o painel julgaria a cobertura pelo último seek, e uma
              // câmera que entra em cobertura enquanto o vídeo avança nunca
              // voltaria a tocar.
              positionMs={positionMs}
              seekCommand={seekCommand}
              onProgress={(localSeconds) => {
                const absoluteMs = localToAbsolute(primaryCoverage, localSeconds);
                // Outside the primary camera's coverage (a gap between its
                // stitched stretches) — nothing maps there. Keep the last known
                // position rather than write a wrong one.
                if (absoluteMs === null) return;
                setPositionMs(absoluteMs);
                report((absoluteMs - timeline.startsAtMs) / 1000, (timeline.endsAtMs - timeline.startsAtMs) / 1000);
              }}
              onEnded={handleEnded}
            />
            <SessionWatermark />

            {paused && (
              <button className={styles.centerPlayOverlay} onClick={() => setPaused(false)} aria-label="Reproduzir">
                <span className={styles.centerPlayBtn}>
                  <Play size={28} fill="currentColor" />
                </span>
              </button>
            )}

            {pauseAdVisible && (
              <span className={styles.pausedChip}>
                <span className={styles.pausedDot} />
                PAUSADO
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.bottomStack}>
        <ReplayTransportBar
          paused={paused}
          onTogglePlay={() => setPaused((p) => !p)}
          timelineStartMs={timeline.startsAtMs}
          timelineEndMs={timeline.endsAtMs}
          positionMs={positionMs}
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
