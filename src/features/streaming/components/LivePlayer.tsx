'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { LiveCamera, LiveStage } from '../types/live.types';
import { CameraGrid, DRAWER_W } from './CameraGrid';
import type { ViewMode } from './CameraGrid';
import { Header } from './Header';
import { TransportBar } from './TransportBar';
import { ChatDock, ReactionsTicker, useChat } from '@/features/chat';
import { useAuth } from '@/features/account/hooks/use-auth';
import { usePlayerHotkeys, VOLUME_STEP, clampVolume } from '../hooks/use-player-hotkeys';
import { useViewerTracking } from '../hooks/use-viewer-tracking';
import { useViewerCount } from '../hooks/use-viewer-count';
import { useFullscreen } from '../hooks/use-fullscreen';
import { usePictureInPicture } from '../hooks/use-picture-in-picture';
import { useQualityLevels } from '../hooks/use-quality-levels';
import { usePlayerAudio } from '../hooks/use-player-audio';
import { useCameraSelection } from '../hooks/use-camera-selection';
import { useLiveDvr } from '../hooks/use-live-dvr';
import { PlayerStage } from './PlayerStage';
import { RecommendedOverlay } from './RecommendedOverlay';
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
  // 'channel': transmissão contínua sem arquivo atrás da janela da origem —
  // não há o que pausar nem para onde rebobinar, então os controles de
  // playback (e o takeover de anúncio que depende deles) saem de cena.
  variant?: 'event' | 'channel';
  // Substitui a linha "palco · câmera · qualidade" do header — o canal mostra
  // a programação (agora / a seguir) nesse espaço.
  metaLineOverride?: string;
  exitHref?: string;
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

export function LivePlayer({ cameras, stages: rawStages, primaryCameraId, librasCameraId, title, eventId, chatEnabled, variant = 'event', metaLineOverride, exitHref }: LivePlayerProps) {
  const t = useTranslations('player');
  const isChannel = variant === 'channel';
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
  const { togglePictureInPicture } = usePictureInPicture(containerRef);
  // Set when the browser blocked unmuted autoplay → drives the "tap for sound"
  // prompt. Cleared for good on the first unmute (see effect below), so it never
  // reappears after the viewer has chosen.
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('main-rail');
  const [cameraStripOpen, setCameraStripOpen] = useState(false);
  // A live stream can be paused: the broadcast keeps going, so resuming picks
  // up where the viewer stopped — behind the live edge, inside the DVR window.
  // Returning to the edge is the transport bar's job, not this state's.
  const [paused, setPaused] = useState(false);
  const togglePlay = () => setPaused((p) => !p);
  const [chatOpen, setChatOpen] = useState(false);
  // Drives the video-shrinks-into-a-card takeover: fed by PauseAdTakeover's
  // onVisibleChange, which fires false on resume/unmount so this can never
  // get stuck shrunk without an ad actually on screen.
  const [pauseAdVisible, setPauseAdVisible] = useState(false);
  const { user } = useAuth();

  const stages = useStages(cameras, rawStages);
  const [activeStageId, setActiveStageId] = useState<string>(() => initialStageId(stages, primaryCameraId));
  const activeStage = stages.find((s) => s.stageId === activeStageId) ?? stages[0];

  // NBR 15290: the Libras window is only relevant when it belongs to the stage
  // currently on screen. When present it is force-activated and can't be removed.
  const librasInStage =
    librasCameraId && activeStage?.cameras.some((c) => c.cameraId === librasCameraId)
      ? librasCameraId
      : null;

  const {
    activeCameraIds,
    setActiveCameraIds,
    setMainCameraId,
    effectiveMainCameraId,
    toggleCamera,
  } = useCameraSelection({
    librasCameraId: librasInStage,
    // Deselecting the current main camera promotes a different one — a
    // scrub-back intent tagged for the old camera no longer applies to the
    // new primary, same as the explicit main-camera-change and stage-change
    // clears below.
    onMainDeselected: () => clearRewindIntent(),
  });

  const dvrState = useLiveDvr(effectiveMainCameraId);
  const { dvr, dvrSeeking, seekCommand, atLive, handleProgress, handleSeek, endRewind, resetForStageChange, clearRewindIntent } = dvrState;

  // Audio follows the MAIN camera unless the viewer explicitly picked an audio
  // source. Falling back to cameras[0] instead used to leave the previous
  // default camera's audio playing after switching the main view.
  const {
    globalMuted,
    setGlobalMuted,
    volume,
    setVolume,
    effectiveAudioCameraId,
    handleAudioCameraChange,
  } = usePlayerAudio({
    cameras: activeStage?.cameras ?? [],
    fallbackCameraId: effectiveMainCameraId ?? activeStage?.cameras[0]?.cameraId ?? null,
  });

  const { levels, onLevelsReady, currentLevel, onSelectLevel, qualityLabel } = useQualityLevels();

  useViewerTracking(eventId, activeCameraIds, user?.id);
  const { currentViewers } = useViewerCount(eventId);
  const chat = useChat(eventId);

  // Live seek commands are addressed to the camera they were issued for (see
  // CameraGrid, which filters on seekCommand.cameraId). endRewind is
  // belt-and-suspenders for that, and owns the intent flag.
  const handleMainCameraChange = (cameraId: string) => {
    setMainCameraId(cameraId);
    endRewind();
  };

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
    resetForStageChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageCameraKey]);

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

  const effectiveViewMode: ViewMode = activeCameraIds.length <= 1 ? 'solo' : viewMode;

  const mainCameraName = activeStage?.cameras.find((c) => c.cameraId === effectiveMainCameraId)?.name;
  const metaLine = metaLineOverride ?? [activeStage?.name, mainCameraName, qualityLabel].filter(Boolean).join(' · ');

  // Once the viewer turns sound on, the autoplay prompt is done for the session.
  useEffect(() => {
    if (!globalMuted) setAutoplayBlocked(false);
  }, [globalMuted]);

  usePlayerHotkeys({
    onToggleFullscreen: toggleFullscreen,
    onToggleCameraPanel: () => setCameraStripOpen((o) => !o),
    onToggleMute: () => setGlobalMuted((m) => !m),
    // Sem pausa no canal, a tecla de espaço não tem o que alternar.
    onTogglePlay: isChannel ? () => {} : togglePlay,
    onVolumeUp: () => { setVolume((v) => clampVolume(v + VOLUME_STEP)); setGlobalMuted(false); },
    onVolumeDown: () => setVolume((v) => clampVolume(v - VOLUME_STEP)),
  });

  return (
    <div ref={containerRef} className={styles.player}>
      <Header
        className={pauseAdVisible ? styles.headerHidden : undefined}
        // Constrain the bar's own box to stop before the camera drawer's
        // DRAWER_W-wide strip — padding alone left the (transparent, but
        // still hit-testable) right edge of the bar sitting over the
        // drawer's close/mode buttons and swallowing their clicks.
        style={cameraStripOpen ? { right: DRAWER_W } : undefined}
        eventId={eventId}
        eventTitle={title}
        metaLine={metaLine}
        stages={stages}
        activeStageId={activeStageId}
        onStageChange={setActiveStageId}
        onExit={() => router.push(exitHref ?? `/events/${eventId}`)}
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
          <PlayerStage
            mode={isChannel ? 'channel' : 'live'}
            paused={paused}
            onResume={() => setPaused(false)}
            pauseAdVisible={pauseAdVisible}
            onPauseAdVisibleChange={setPauseAdVisible}
          >
            {activeStage && (
              <CameraGrid
                key={activeStage.stageId}
                cameras={activeStage.cameras}
                selectedLevel={currentLevel}
                onLevelsReady={onLevelsReady}
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
                onToggleCamera={toggleCamera}
                onClosePicker={() => setCameraStripOpen(false)}
                dvrActive={dvrSeeking}
                seekCommand={seekCommand}
                onProgress={handleProgress}
              />
            )}
          </PlayerStage>

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
          onTogglePlay={togglePlay}
          showPlayback={!isChannel}
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
          onSelectLevel={onSelectLevel}
          onTogglePip={togglePictureInPicture}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>

      <ReactionsTicker totalReactions={chat.totalReactions} />

      <RecommendedOverlay eventId={eventId} containerRef={containerRef} isFullscreen={isFullscreen} />
    </div>
  );
}
