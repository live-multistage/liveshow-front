'use client';

import { Children, isValidElement, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { PlayerShell } from '../../hooks/use-player-shell';
import { shareCurrentPage } from '../../utils/share-current-page';
import { CameraGrid, DRAWER_W } from '../CameraGrid';
import type { CameraGridProps } from '../CameraGrid';
import { Header as HeaderBar } from '../Header';
import { PlayerStage as StageFrame } from '../PlayerStage';
import { RecommendedOverlay } from '../RecommendedOverlay';
import { PlayerProvider, usePlayer } from './PlayerContext';
import type { PlayerContextValue, PlayerMode } from './PlayerContext';
import styles from './PlayerParts.module.scss';

export interface PlayerRootProps {
  shell: PlayerShell;
  mode: PlayerMode;
  // Chat room + header/exit target. A channel passes its own broadcast event.
  eventId: string;
  title: string;
  // The event actually on screen — defaults to `eventId`.
  playbackEventId?: string;
  adsEnabled?: boolean;
  children: ReactNode;
}

// Dev-only: the parts position themselves absolutely inside .player, so a
// second Stage or Transport stacks invisibly on top of the first instead of
// failing loudly. Only DIRECT descendants are scanned — deep nesting is not
// supported by design (spec §2).
function useSinglePartWarning(children: ReactNode) {
  // Only the mount-time composition matters — a mode never rearranges its own
  // <Player.Root> children across renders, so re-walking on every render (the
  // old `[children]` dep) re-did this work for nothing. The ref hands the
  // effect the latest children without making it re-run for them.
  const childrenRef = useRef(children);
  childrenRef.current = children;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    let stages = 0;
    let transports = 0;
    Children.forEach(childrenRef.current, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === Stage) stages += 1;
      if (child.type === TransportRegion) transports += 1;
    });
    if (stages > 1) console.warn(`<Player.Stage> rendered ${stages} times inside <Player.Root>; only one is supported.`);
    if (transports > 1) console.warn(`<Player.Transport> rendered ${transports} times inside <Player.Root>; only one is supported.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately mount-only, see comment above.
  }, []);
}

// Owns the fullscreen/PiP host element and publishes the shell. The mode still
// calls usePlayerShell itself: its handlers (onEnded, DVR seek) need the shell
// before this tree exists.
function Root({ shell, mode, eventId, title, playbackEventId, adsEnabled = true, children }: PlayerRootProps) {
  const value: PlayerContextValue = {
    shell,
    mode,
    eventId,
    title,
    playbackEventId: playbackEventId ?? eventId,
    adsEnabled,
  };

  useSinglePartWarning(children);

  return (
    <PlayerProvider value={value}>
      <div ref={shell.containerRef} className={styles.player}>
        {children}
      </div>
    </PlayerProvider>
  );
}

export interface PlayerHeaderProps {
  badge: 'live' | 'replay';
  exitHref?: string;
  // Replaces the "stage · camera · quality" line (channel shows its schedule).
  metaLine?: string;
  // Live-only chrome; omitted for replay.
  currentViewers?: number;
  chat?: { open: boolean; onToggle: () => void; messageCount: number };
}

function PlayerHeader({ badge, exitHref, metaLine, currentViewers, chat }: PlayerHeaderProps) {
  const { shell, eventId, title } = usePlayer();
  const t = useTranslations('player');
  const router = useRouter();

  return (
    <HeaderBar
      className={shell.pauseAdVisible ? styles.headerHidden : undefined}
      // Constrain the bar's own box to stop before the camera drawer's
      // DRAWER_W-wide strip — padding alone left the (transparent, but still
      // hit-testable) right edge of the bar sitting over the drawer's
      // close/mode buttons and swallowing their clicks.
      style={shell.cameraStripOpen ? { right: DRAWER_W } : undefined}
      badge={badge}
      eventId={eventId}
      eventTitle={title}
      metaLine={metaLine ?? shell.metaLine}
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
  );
}

// Playback wiring that differs per mode and is handed straight to CameraGrid.
// Everything else CameraGrid needs comes from the shell.
export type PlayerStagePartProps = Pick<
  CameraGridProps,
  'positionMs' | 'seekCommand' | 'onProgress' | 'onEnded' | 'onAutoplayBlocked' | 'dvrActive'
>;

function Stage(gridProps: PlayerStagePartProps) {
  const { shell, mode, playbackEventId, adsEnabled } = usePlayer();
  const { audio, quality } = shell;

  return (
    <div className={styles.stage}>
      <StageFrame
        mode={mode}
        eventId={playbackEventId}
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
            // A channel plays a live manifest like any other live stream.
            mode={mode === 'replay' ? 'replay' : 'live'}
            {...gridProps}
          />
        )}
      </StageFrame>
    </div>
  );
}

// The bottom-anchored transport region. Children are laid out as one flex row
// in declaration order.
function TransportRegion({ children }: { children: ReactNode }) {
  return (
    <div className={styles.bottomStack}>
      <div className={styles.bar}>{children}</div>
    </div>
  );
}

// The chat dock / drawer. It positions itself against .player; this part exists
// so a composition reads as a layout, not as a loose child.
function Aside({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// Fullscreen-only recommended rail.
function Overlay() {
  const { shell, eventId } = usePlayer();
  return (
    <RecommendedOverlay eventId={eventId} containerRef={shell.containerRef} isFullscreen={shell.isFullscreen} />
  );
}

export const Player = {
  Root,
  Header: PlayerHeader,
  Stage,
  Transport: TransportRegion,
  Aside,
  Overlay,
};
