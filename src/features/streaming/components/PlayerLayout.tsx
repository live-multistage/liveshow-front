'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { PlayerShell } from '../hooks/use-player-shell';
import { shareCurrentPage } from '../utils/share-current-page';
import { CameraGrid, DRAWER_W } from './CameraGrid';
import type { CameraGridProps } from './CameraGrid';
import { Header } from './Header';
import { PlayerStage } from './PlayerStage';
import { RecommendedOverlay } from './RecommendedOverlay';
import styles from './Player.module.scss';

// Playback wiring that differs per mode and is handed straight to CameraGrid.
export type PlayerGridProps = Pick<
  CameraGridProps,
  'seekCommand' | 'positionMs' | 'onProgress' | 'onEnded' | 'dvrActive' | 'onAutoplayBlocked'
>;

export interface PlayerLayoutProps {
  shell: PlayerShell;
  mode: 'live' | 'replay' | 'channel';
  badge: 'live' | 'replay';
  title: string;
  // Chat room + header/exit target. A channel passes its own broadcast event.
  eventId: string;
  // What the pause-ad takeover is keyed on — the event actually on screen,
  // which for a channel is the resolved source. Defaults to `eventId`.
  playbackEventId?: string;
  exitHref?: string;
  // Replaces the "stage · camera · quality" line (channel shows its schedule).
  metaLineOverride?: string;
  adsEnabled?: boolean;
  // Live-only chrome; omitted for replay.
  currentViewers?: number;
  chat?: { open: boolean; onToggle: () => void; messageCount: number };
  // Slots.
  transport: ReactNode;
  gridProps?: PlayerGridProps;
  // Rendered next to the stage inside .main (the chat dock).
  aside?: ReactNode;
  // Rendered last inside the fullscreen container (ticker, prompts, overlays).
  extras?: ReactNode;
}

// The chrome shared by live, channel and replay: header, stage + camera grid,
// bottom transport stack, recommendation overlay. Everything stateful comes
// from usePlayerShell; everything mode-specific comes in through slots.
export function PlayerLayout({
  shell,
  mode,
  badge,
  title,
  eventId,
  playbackEventId,
  exitHref,
  metaLineOverride,
  adsEnabled = true,
  currentViewers,
  chat,
  transport,
  gridProps,
  aside,
  extras,
}: PlayerLayoutProps) {
  const t = useTranslations('player');
  const router = useRouter();
  const { audio, quality } = shell;

  return (
    <div ref={shell.containerRef} className={styles.player}>
      <Header
        className={shell.pauseAdVisible ? styles.headerHidden : undefined}
        // Constrain the bar's own box to stop before the camera drawer's
        // DRAWER_W-wide strip — padding alone left the (transparent, but
        // still hit-testable) right edge of the bar sitting over the
        // drawer's close/mode buttons and swallowing their clicks.
        style={shell.cameraStripOpen ? { right: DRAWER_W } : undefined}
        badge={badge}
        eventId={eventId}
        eventTitle={title}
        metaLine={metaLineOverride ?? shell.metaLine}
        stages={shell.stages}
        activeStageId={shell.activeStageId}
        onStageChange={shell.setActiveStageId}
        onExit={() => router.push(exitHref ?? `/events/${eventId}`)}
        currentViewers={currentViewers}
        cameraCount={shell.stageCameras.length}
        cameraStripOpen={shell.cameraStripOpen}
        onToggleCameraStrip={shell.toggleCameraStrip}
        chatEnabled={!!chat}
        chatOpen={chat?.open}
        onToggleChat={chat?.onToggle}
        chatMessageCount={chat?.messageCount}
        onShare={() => shareCurrentPage(title, () => toast.success(t('linkCopied')))}
      />

      <div className={styles.main}>
        <div className={styles.gridArea}>
          <PlayerStage
            mode={mode}
            eventId={playbackEventId ?? eventId}
            paused={shell.paused}
            onResume={() => shell.setPaused(false)}
            pauseAdVisible={shell.pauseAdVisible}
            onPauseAdVisibleChange={shell.setPauseAdVisible}
            adsEnabled={adsEnabled}
          >
            {shell.activeStage && (
              <CameraGrid
                key={shell.activeStage.stageId}
                cameras={shell.stageCameras}
                selectedLevel={quality.currentLevel}
                onLevelsReady={quality.onLevelsReady}
                globalMuted={audio.globalMuted}
                onGlobalMutedChange={audio.setGlobalMuted}
                audioCameraId={audio.effectiveAudioCameraId}
                onAudioCameraChange={audio.handleAudioCameraChange}
                volume={audio.volume}
                paused={shell.paused}
                viewMode={shell.effectiveViewMode}
                onViewModeChange={shell.setViewMode}
                mainCameraId={shell.effectiveMainCameraId}
                onMainCameraChange={shell.handleMainCameraChange}
                activeCameraIds={shell.activeCameraIds}
                librasCameraId={shell.librasInStage}
                pickerOpen={shell.cameraStripOpen}
                onToggleCamera={shell.toggleCamera}
                onClosePicker={() => shell.setCameraStripOpen(false)}
                mode={mode === 'replay' ? 'replay' : 'live'}
                {...gridProps}
              />
            )}
          </PlayerStage>
        </div>

        {aside}
      </div>

      <div className={styles.bottomStack}>{transport}</div>

      <RecommendedOverlay eventId={eventId} containerRef={shell.containerRef} isFullscreen={shell.isFullscreen} />

      {extras}
    </div>
  );
}
