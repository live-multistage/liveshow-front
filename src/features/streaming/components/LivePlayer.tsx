'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { LiveCamera, LiveStage } from '../types/live.types';
import { CameraGrid } from './CameraGrid';
import type { QualityLevel, ViewMode } from './CameraGrid';
import { Header } from './Header';
import { TransportBar } from './TransportBar';
import { ChatDock, ReactionsTicker, useChat } from '@/features/chat';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useViewerTracking } from '../hooks/use-viewer-tracking';
import { useViewerCount } from '../hooks/use-viewer-count';
import styles from './LivePlayer.module.scss';

interface LivePlayerProps {
  cameras: LiveCamera[];
  stages?: LiveStage[];
  primaryCameraId?: string | null;
  title: string;
  eventId: string;
  chatEnabled: boolean;
}

function useStages(cameras: LiveCamera[], rawStages?: LiveStage[]): LiveStage[] {
  return useMemo(() => {
    if (rawStages && rawStages.length > 0) {
      return [...rawStages]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ ...s, cameras: [...s.cameras].sort((a, b) => a.priority - b.priority) }));
    }
    return [{ stageId: '__main__', name: 'Palco Principal', slug: 'main', position: 0, cameras: [...cameras].sort((a, b) => a.priority - b.priority) }];
  }, [cameras, rawStages]);
}

function initialStageId(stages: LiveStage[], primaryCameraId?: string | null): string {
  if (primaryCameraId) {
    const match = stages.find((s) => s.cameras.some((c) => c.cameraId === primaryCameraId));
    if (match) return match.stageId;
  }
  return stages.find((s) => s.cameras.length > 0)?.stageId ?? stages[0]?.stageId ?? '__main__';
}

export function LivePlayer({ cameras, stages: rawStages, primaryCameraId, title, eventId, chatEnabled }: LivePlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Starts muted — browser autoplay policy requires it.
  const [globalMuted, setGlobalMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [audioCameraId, setAudioCameraId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('main-rail');
  const [mainCameraId, setMainCameraId] = useState<string | null>(null);
  const [activeCameraIds, setActiveCameraIds] = useState<string[]>([]);
  const [cameraStripOpen, setCameraStripOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { user } = useAuth();

  useViewerTracking(eventId, activeCameraIds, user?.id);
  const { currentViewers } = useViewerCount(eventId);
  const chat = useChat(eventId);

  const stages = useStages(cameras, rawStages);
  const [activeStageId, setActiveStageId] = useState<string>(() => initialStageId(stages, primaryCameraId));

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  const activeStage = stages.find((s) => s.stageId === activeStageId) ?? stages[0];

  const stageCameraKey = (activeStage?.cameras ?? []).map((c) => c.cameraId).sort().join(',');
  useEffect(() => {
    const first = activeStage?.cameras[0]?.cameraId;
    setActiveCameraIds(first ? [first] : []);
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
      toast.success('Link copiado');
    }
  };

  const handleToggleCamera = (cameraId: string) => {
    if (activeCameraIds.includes(cameraId)) {
      if (activeCameraIds.length > 1) setActiveCameraIds(activeCameraIds.filter((id) => id !== cameraId));
    } else {
      setActiveCameraIds([...activeCameraIds, cameraId]);
    }
  };

  const activeLevel = levels.find((l) => l.index === currentLevel);
  const qualityLabel = currentLevel === -1 ? 'Auto' : activeLevel ? `${activeLevel.height}p` : 'Auto';

  const effectiveAudioCameraId =
    audioCameraId && activeStage?.cameras.some((c) => c.cameraId === audioCameraId)
      ? audioCameraId
      : (activeStage?.cameras[0]?.cameraId ?? null);

  const effectiveMainCameraId =
    mainCameraId && activeCameraIds.includes(mainCameraId)
      ? mainCameraId
      : (activeCameraIds[0] ?? null);

  const effectiveViewMode: ViewMode = activeCameraIds.length <= 1 ? 'solo' : viewMode;

  const mainCameraName = activeStage?.cameras.find((c) => c.cameraId === effectiveMainCameraId)?.name;
  const metaLine = [activeStage?.name, mainCameraName, qualityLabel].filter(Boolean).join(' · ');

  const handleAudioCameraChange = (id: string) => {
    setAudioCameraId(id);
    setGlobalMuted(false);
  };

  return (
    <div ref={containerRef} className={styles.player}>
      <Header
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
          {activeStage && (
            <CameraGrid
              key={activeStage.stageId}
              cameras={activeStage.cameras}
              selectedLevel={currentLevel}
              onLevelsReady={setLevels}
              globalMuted={globalMuted}
              onGlobalMutedChange={setGlobalMuted}
              audioCameraId={effectiveAudioCameraId}
              onAudioCameraChange={handleAudioCameraChange}
              volume={volume}
              viewMode={effectiveViewMode}
              onViewModeChange={setViewMode}
              mainCameraId={effectiveMainCameraId}
              onMainCameraChange={setMainCameraId}
              activeCameraIds={activeCameraIds}
              pickerOpen={cameraStripOpen}
              onToggleCamera={handleToggleCamera}
              onClosePicker={() => setCameraStripOpen(false)}
            />
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
