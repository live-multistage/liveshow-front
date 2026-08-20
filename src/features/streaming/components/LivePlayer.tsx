'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Volume2, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { LiveCamera, LiveStage } from '../types/live.types';
import { CameraGrid } from './CameraGrid';
import type { QualityLevel, ViewMode } from './CameraGrid';
import { Header } from './Header';
import { TransportBar } from './TransportBar';
import type { DvrState } from './TransportBar';
import { isAtLiveEdge } from '../hooks/use-transport-controls';
import type { LiveSeekCommand, LiveWindow } from '../hooks/use-transport-controls';
import { ChatDock, ReactionsTicker, useChat } from '@/features/chat';
import { useAuth } from '@/features/account/hooks/use-auth';
import { usePlayerHotkeys, VOLUME_STEP, clampVolume } from '../hooks/use-player-hotkeys';
import { useViewerTracking } from '../hooks/use-viewer-tracking';
import { useViewerCount } from '../hooks/use-viewer-count';
import { SessionWatermark } from './SessionWatermark';
import { PauseAdTakeover } from '@/features/advertisements/components/PauseAdTakeover';
import styles from './LivePlayer.module.scss';

interface LivePlayerProps {
  cameras: LiveCamera[];
  stages?: LiveStage[];
  primaryCameraId?: string | null;
  // NBR 15290 — camera pinned as the mandatory Libras window (null if none).
  librasCameraId?: string | null;
  title: string;
  eventId: string;
  chatEnabled: boolean;
}

function useStages(cameras: LiveCamera[], rawStages?: LiveStage[]): LiveStage[] {
  const t = useTranslations('player');
  return useMemo(() => {
    if (rawStages && rawStages.length > 0) {
      return [...rawStages]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ ...s, cameras: [...s.cameras].sort((a, b) => a.priority - b.priority) }));
    }
    return [{ stageId: '__main__', name: t('mainStage'), slug: 'main', position: 0, cameras: [...cameras].sort((a, b) => a.priority - b.priority) }];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras, rawStages]);
}

function initialStageId(stages: LiveStage[], primaryCameraId?: string | null): string {
  if (primaryCameraId) {
    const match = stages.find((s) => s.cameras.some((c) => c.cameraId === primaryCameraId));
    if (match) return match.stageId;
  }
  return stages.find((s) => s.cameras.length > 0)?.stageId ?? stages[0]?.stageId ?? '__main__';
}

export function LivePlayer({ cameras, stages: rawStages, primaryCameraId, librasCameraId, title, eventId, chatEnabled }: LivePlayerProps) {
  const t = useTranslations('player');
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Start with sound (YouTube-style). VideoPanel attempts unmuted autoplay and,
  // if the browser blocks it, falls back to muted and flips this back to true
  // (see onAutoplayBlocked → CameraGrid → here).
  const [globalMuted, setGlobalMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  // Set when the browser blocked unmuted autoplay → drives the "tap for sound"
  // prompt. Cleared for good on the first unmute (see effect below), so it never
  // reappears after the viewer has chosen.
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [audioCameraId, setAudioCameraId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('main-rail');
  const [mainCameraId, setMainCameraId] = useState<string | null>(null);
  const [activeCameraIds, setActiveCameraIds] = useState<string[]>([]);
  const [cameraStripOpen, setCameraStripOpen] = useState(false);
  // A live stream can be paused: the broadcast keeps going, so resuming picks
  // up where the viewer stopped — behind the live edge, inside the DVR window.
  // Returning to the edge is the transport bar's job, not this state's.
  const [paused, setPaused] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // Drives the video-shrinks-into-a-card takeover: fed by PauseAdTakeover's
  // onVisibleChange, which fires false on resume/unmount so this can never
  // get stuck shrunk without an ad actually on screen.
  const [pauseAdVisible, setPauseAdVisible] = useState(false);
  const { user } = useAuth();

  useViewerTracking(eventId, activeCameraIds, user?.id);
  const { currentViewers } = useViewerCount(eventId);
  const chat = useChat(eventId);

  const stages = useStages(cameras, rawStages);
  const [activeStageId, setActiveStageId] = useState<string>(() => initialStageId(stages, primaryCameraId));

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  // DVR: where the primary panel sits inside the manifest's seekable window,
  // reported by that panel's own playback events. Null until the first report.
  const [dvr, setDvr] = useState<DvrState | null>(null);
  // The viewer's INTENT to sit behind the live edge, set only by an actual
  // scrub-back. Deliberately NOT derived from `atLive` below: that is a
  // MEASURED distance, and an ordinary rebuffer of more than
  // LIVE_EDGE_TOLERANCE_SEC also puts the position behind the edge. Feeding
  // that into hls.js's liveMaxLatencyDurationCount (which DVR lifts to
  // Infinity) would permanently disable its catch-up for any viewer who ever
  // stalls, on STANDARD live where nothing else reduces drift.
  const [dvrSeeking, setDvrSeeking] = useState(false);
  const [seekCommand, setSeekCommand] = useState<LiveSeekCommand | null>(null);

  // Stable identity: this lands on the primary VideoPanel's timeupdate
  // listener, which would otherwise be torn down and re-added on every tick.
  const handleProgress = useCallback((position: number, end: number, live?: LiveWindow) => {
    if (!live) return;
    setDvr({ position, end, start: live.start, edge: live.edge, tolerance: live.tolerance });
  }, []);

  const atLive = !dvr || isAtLiveEdge(dvr.position, dvr.edge, dvr.tolerance);

  // Live seek commands are addressed to the camera they were issued for (see
  // CameraGrid, which now filters on seekCommand.cameraId). Clearing here is
  // belt-and-suspenders for that, but it does own the intent flag: promoting
  // another camera ends the rewind, and the promoted panel is at the same
  // wall-clock instant anyway from following the previous primary's
  // PROGRAM-DATE-TIME (use-clock-sync).
  const handleMainCameraChange = useCallback((cameraId: string) => {
    setMainCameraId(cameraId);
    setSeekCommand(null);
    setDvrSeeking(false);
  }, []);

  const activeStage = stages.find((s) => s.stageId === activeStageId) ?? stages[0];

  // NBR 15290: the Libras window is only relevant when it belongs to the stage
  // currently on screen. When present it is force-activated and can't be removed.
  const librasInStage =
    librasCameraId && activeStage?.cameras.some((c) => c.cameraId === librasCameraId)
      ? librasCameraId
      : null;

  const stageCameraKey = (activeStage?.cameras ?? []).map((c) => c.cameraId).sort().join(',');
  useEffect(() => {
    const first = activeStage?.cameras[0]?.cameraId;
    // Always keep the Libras window active alongside the default camera.
    const initial = first
      ? librasInStage && librasInStage !== first
        ? [first, librasInStage]
        : [first]
      : librasInStage
        ? [librasInStage]
        : [];
    setActiveCameraIds(initial);
    // A seek/DVR position belongs to the stage it was taken in: the new stage's
    // cameras are different manifests with unrelated media timelines, and
    // CameraGrid remounts on the stage key, so a surviving command would be
    // replayed onto a fresh panel as a meaningless offset.
    setSeekCommand(null);
    setDvr(null);
    setDvrSeeking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageCameraKey]);

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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the native share sheet.
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t('linkCopied'));
    }
  };

  const handleToggleCamera = (cameraId: string) => {
    // The Libras window is mandatory (NBR 15290) — never removable.
    if (cameraId === librasInStage) return;
    if (activeCameraIds.includes(cameraId)) {
      if (activeCameraIds.length > 1) {
        setActiveCameraIds(activeCameraIds.filter((id) => id !== cameraId));
        // Deselecting the current main camera promotes a different one (see
        // effectiveMainCameraId) — a scrub-back intent tagged for the old
        // camera no longer applies to the new primary, same as the explicit
        // main-camera-change and stage-change clears above.
        if (cameraId === effectiveMainCameraId) setDvrSeeking(false);
      }
    } else {
      setActiveCameraIds([...activeCameraIds, cameraId]);
    }
  };

  const activeLevel = levels.find((l) => l.index === currentLevel);
  const qualityLabel = currentLevel === -1 ? 'Auto' : activeLevel ? `${activeLevel.height}p` : 'Auto';

  const effectiveMainCameraId =
    mainCameraId && activeCameraIds.includes(mainCameraId)
      ? mainCameraId
      : (activeCameraIds[0] ?? null);

  // Audio follows the MAIN camera unless the viewer explicitly picked an audio
  // source. Falling back to cameras[0] instead used to leave the previous
  // default camera's audio playing after switching the main view.
  const effectiveAudioCameraId =
    audioCameraId && activeStage?.cameras.some((c) => c.cameraId === audioCameraId)
      ? audioCameraId
      : (effectiveMainCameraId ?? activeStage?.cameras[0]?.cameraId ?? null);

  // Declared here (not memoized) because it needs the camera the seek is
  // addressed to. onSeek fires on a scrubber drag / badge click, never on a
  // playback tick, so a fresh identity per render costs nothing.
  const handleSeek = (time: number) => {
    // Optimistic, so the scrubber tracks the drag instead of snapping back
    // between timeupdates (same pattern as ReplayPlayer).
    setDvr((d) => (d ? { ...d, position: time } : d));
    // Intent: seeking meaningfully behind the edge starts a DVR rewind;
    // seeking TO the edge (the badge's "back to live") ends it.
    setDvrSeeking(!!dvr && !isAtLiveEdge(time, dvr.edge, dvr.tolerance));
    setSeekCommand({ time, token: Date.now(), cameraId: effectiveMainCameraId });
  };

  const effectiveViewMode: ViewMode = activeCameraIds.length <= 1 ? 'solo' : viewMode;

  const mainCameraName = activeStage?.cameras.find((c) => c.cameraId === effectiveMainCameraId)?.name;
  const metaLine = [activeStage?.name, mainCameraName, qualityLabel].filter(Boolean).join(' · ');

  const handleAudioCameraChange = (id: string) => {
    setAudioCameraId(id);
    setGlobalMuted(false);
  };

  // Once the viewer turns sound on, the autoplay prompt is done for the session.
  useEffect(() => {
    if (!globalMuted) setAutoplayBlocked(false);
  }, [globalMuted]);

  usePlayerHotkeys({
    onToggleFullscreen: toggleFullscreen,
    onToggleCameraPanel: () => setCameraStripOpen((o) => !o),
    onToggleMute: () => setGlobalMuted((m) => !m),
    onTogglePlay: () => setPaused((p) => !p),
    onVolumeUp: () => { setVolume((v) => clampVolume(v + VOLUME_STEP)); setGlobalMuted(false); },
    onVolumeDown: () => setVolume((v) => clampVolume(v - VOLUME_STEP)),
  });

  return (
    <div ref={containerRef} className={styles.player}>
      <Header
        className={pauseAdVisible ? styles.headerHidden : undefined}
        eventId={eventId}
        eventTitle={title}
        metaLine={metaLine}
        stages={stages}
        activeStageId={activeStageId}
        onStageChange={setActiveStageId}
        onExit={() => router.push(`/events/${eventId}`)}
        currentViewers={currentViewers}
        cameraCount={activeStage?.cameras.length ?? 0}
        cameraStripOpen={cameraStripOpen}
        onToggleCameraStrip={() => setCameraStripOpen((o) => !o)}
        chatEnabled={chatEnabled}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
        chatMessageCount={chat.messages.length}
        onShare={handleShare}
      />

      <div className={styles.main}>
        <div className={styles.gridArea}>
          <PauseAdTakeover
            paused={paused}
            onResume={() => setPaused(false)}
            onVisibleChange={setPauseAdVisible}
          />

          <div className={`${styles.stageArea} ${pauseAdVisible ? styles.stageAreaShrunk : ''}`}>
            {activeStage && (
              <CameraGrid
                key={activeStage.stageId}
                cameras={activeStage.cameras}
                selectedLevel={currentLevel}
                onLevelsReady={setLevels}
                globalMuted={globalMuted}
                onGlobalMutedChange={setGlobalMuted}
                onAutoplayBlocked={() => { setGlobalMuted(true); setAutoplayBlocked(true); }}
                audioCameraId={effectiveAudioCameraId}
                onAudioCameraChange={handleAudioCameraChange}
                volume={volume}
                paused={paused}
                viewMode={effectiveViewMode}
                onViewModeChange={setViewMode}
                mainCameraId={effectiveMainCameraId}
                onMainCameraChange={handleMainCameraChange}
                activeCameraIds={activeCameraIds}
                librasCameraId={librasInStage}
                pickerOpen={cameraStripOpen}
                onToggleCamera={handleToggleCamera}
                onClosePicker={() => setCameraStripOpen(false)}
                dvrActive={dvrSeeking}
                seekCommand={seekCommand}
                onProgress={handleProgress}
              />
            )}

            <SessionWatermark />

            {/* Sem isto, uma live pausada é indistinguível de uma transmissão
                travada: a imagem congela e nada na tela explica por quê. */}
            {paused && (
              <button
                type="button"
                className={styles.centerPlayOverlay}
                onClick={() => setPaused(false)}
                aria-label={t('resume')}
              >
                <span className={styles.centerPlayBtn}>
                  <Play size={28} fill="currentColor" />
                </span>
              </button>
            )}

            {pauseAdVisible && (
              <span className={styles.pausedChip}>
                <span className={styles.pausedDot} />
                AO VIVO · PAUSADO
              </span>
            )}
          </div>

          {autoplayBlocked && globalMuted && (
            <button
              type="button"
              className={styles.unmutePrompt}
              onClick={() => setGlobalMuted(false)}
            >
              <Volume2 size={16} />
              {t('unmutePrompt')}
            </button>
          )}
        </div>

        {chatEnabled && (
          <ChatDock
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            messages={chat.messages}
            onSend={chat.sendMessage}
            onReact={chat.react}
          />
        )}
      </div>

      <div className={styles.bottomStack}>
        <TransportBar
          dvr={dvr}
          atLive={atLive}
          onSeek={handleSeek}
          paused={paused}
          onTogglePlay={() => setPaused((p) => !p)}
          globalMuted={globalMuted}
          onToggleMute={() => setGlobalMuted((m) => !m)}
          volume={volume}
          onVolumeChange={setVolume}
          audioCameras={activeStage?.cameras ?? []}
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

      <ReactionsTicker totalReactions={chat.totalReactions} />
    </div>
  );
}
