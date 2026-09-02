'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { HandMetal } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import type { QualityLevel } from './VideoPanel';
import type { ClockSample } from '../hooks/use-clock-sync';
import type { LiveSeekCommand, LiveWindow } from '../hooks/use-transport-controls';
import { computeSlotLayout, HIDDEN_STYLE, DRAWER_W } from './camera-layout';
import type { Role, ViewMode } from './camera-layout';
import { CameraDrawer } from './CameraDrawer';
import styles from './CameraGrid.module.scss';

export type { QualityLevel };
export type { ViewMode } from './camera-layout';
export { DRAWER_W } from './camera-layout';

// Layout constants (previously split across MainRailView/CameraRail/PipOverlay).
const RAIL_W = 240;
const PIP_W = 220;
const PIP_H = (PIP_W * 9) / 16;
const PIP_RIGHT = 16;
const PIP_BOTTOM = 88; // clears LivePlayer's floating bottom stack (5.5rem)
const GAP = 2;

// Right picker drawer (MULTICAM). Floats over the right edge of the stage;
// thumbnails stack vertically inside, reusing the persistent panels.
const DRAWER_W = 220;        // drawer width (px)
const DRAWER_HEADER_H = 52;  // header row (title + modes + close)
const DRAWER_PAD = 12;
const DRAWER_BOTTOM = 96;    // clear the floating transport bar at the bottom
const DRAWER_ROW_H = 44;     // active-camera placeholder row height in the drawer

const MODES: { id: ViewMode; label: string; icon: typeof Square }[] = [
  { id: 'solo', label: 'Solo', icon: Square },
  { id: 'main-rail', label: 'Principal + trilha', icon: PanelRight },
  { id: 'grid', label: 'Grade', icon: LayoutGrid },
];

// Off-screen-but-alive: opacity 0 (not visibility:hidden / display:none, which
// browsers throttle or pause) so a hidden camera keeps decoding at the live
// edge and reveals in sync when it becomes a PIP/rail/main — no reload jump.
const HIDDEN_STYLE = { inset: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 } as const;

type Role = 'main' | 'pip' | 'rail' | 'grid' | 'strip' | 'libras' | 'hidden';
interface Slot {
  role: Role;
  style: CSSProperties;
}

interface CameraGridProps {
  cameras: LiveCamera[];
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  globalMuted: boolean;
  onGlobalMutedChange: (muted: boolean) => void;
  // Bubbled up from the audio VideoPanel when the browser blocks unmuted
  // autoplay — LivePlayer uses it to show the "tap for sound" prompt.
  onAutoplayBlocked?: () => void;
  audioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  volume: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  mainCameraId: string | null;
  onMainCameraChange: (cameraId: string) => void;
  activeCameraIds: string[];
  // NBR 15290 — camera pinned bottom-right as the mandatory Libras window in
  // every view mode; excluded from the main/rail/grid composition and never
  // removable. Null when the event has no Libras window.
  librasCameraId?: string | null;
  mode?: 'live' | 'replay';
  paused?: boolean;
  // Replay: instante absoluto atual do evento, para cada painel julgar a
  // própria cobertura contra ele.
  positionMs?: number;
  // Live only: the viewer DELIBERATELY scrubbed back in the DVR window (see
  // LivePlayer — this is intent, never measured drift).
  dvrActive?: boolean;
  seekCommand?: LiveSeekCommand | null;
  onProgress?: (currentTime: number, duration: number, live?: LiveWindow) => void;
  onEnded?: () => void;
  pickerOpen?: boolean;
  onToggleCamera?: (cameraId: string) => void;
  onClosePicker?: () => void;
}

// One persistent VideoPanel per active camera, positioned absolutely by its
// ROLE in the current view mode. Because each panel is keyed by cameraId and
// never unmounts when it changes role, promoting a thumbnail to main only moves
// the same <video>/hls.js element (a CSS rect change) — no reload, no re-seek,
// no desync. The panels animate between rects for a smooth swap.
//
// ponytail: every active camera decodes at all times (even hidden in Solo) so
// any switch is instant. Fine for the handful of cameras a stage has; if that
// ever hurts CPU, unmount non-visible panels in Solo and accept a reload there.
export function CameraGrid({
  cameras,
  selectedLevel,
  onLevelsReady,
  globalMuted,
  onGlobalMutedChange,
  onAutoplayBlocked,
  audioCameraId,
  onAudioCameraChange,
  volume,
  viewMode,
  onViewModeChange,
  mainCameraId,
  onMainCameraChange,
  activeCameraIds,
  librasCameraId = null,
  mode = 'live',
  paused,
  positionMs,
  dvrActive = false,
  seekCommand,
  onProgress,
  onEnded,
  pickerOpen = false,
  onToggleCamera = () => {},
  onClosePicker = () => {},
}: CameraGridProps) {
  const t = useTranslations('player');
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  // Shared wall-clock: the primary panel writes its PROGRAM-DATE-TIME position
  // here; every other live panel corrects against it (see use-clock-sync).
  const clockRef = useRef<ClockSample | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((p) => (p.width === width && p.height === height ? p : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleAspectRatioReady = (cameraId: string, ratio: number) => {
    setAspectRatios((prev) => (prev[cameraId] === ratio ? prev : { ...prev, [cameraId]: ratio }));
  };

  const cameraById = useMemo(() => new Map(cameras.map((c) => [c.cameraId, c])), [cameras]);
  const activeCameras = useMemo(
    () => activeCameraIds.map((id) => cameraById.get(id)).filter((c): c is LiveCamera => !!c),
    [activeCameraIds, cameraById],
  );

  // The Libras window is laid out separately (fixed bottom-right PiP) and is
  // excluded from the main/rail/grid composition so it never becomes the main
  // camera, a rail tile, or a grid cell.
  const librasCamera = librasCameraId
    ? activeCameras.find((c) => c.cameraId === librasCameraId) ?? null
    : null;
  const compositionCameras = librasCamera
    ? activeCameras.filter((c) => c.cameraId !== librasCamera.cameraId)
    : activeCameras;

  const mainCamera =
    compositionCameras.find((c) => c.cameraId === mainCameraId) ?? compositionCameras[0] ?? null;
  const effectiveMode: ViewMode = compositionCameras.length <= 1 ? 'solo' : viewMode;
  const otherCameras = mainCamera
    ? compositionCameras.filter((c) => c.cameraId !== mainCamera.cameraId)
    : [];

  const layouts = useMemo(
    () =>
      computeSlotLayout({
        size,
        aspectRatios,
        effectiveMode,
        cameras,
        activeCameraIds,
        compositionCameras,
        otherCameras,
        mainCamera,
        librasCamera,
        pickerOpen,
      }),
    [effectiveMode, compositionCameras, librasCamera, otherCameras, mainCamera, size, aspectRatios, pickerOpen, cameras, activeCameraIds],
  );

  const roleClass: Record<Role, string> = {
    main: styles.mainSlot,
    pip: styles.pipSlot,
    rail: styles.railSlot,
    grid: styles.gridSlot,
    strip: styles.stripSlot,
    libras: styles.librasSlot,
    hidden: styles.hiddenSlot,
  };

  // The stage (with the ResizeObserver ref) is ALWAYS rendered — even before
  // cameras load — so the observer attaches on first mount and `size` is
  // measured. Rendering it only once mainCamera exists left the ref unattached
  // (the effect had already run against the empty-state branch), so `size`
  // stayed 0 and the grid layout, which needs it, produced nothing.
  //
  // We render a VideoPanel for EVERY stage camera (not just the active ones),
  // keyed by cameraId. Cameras not in the active selection sit at HIDDEN_STYLE
  // (opacity 0, decoding in the background). So the first time the page mounts,
  // all cameras load their HLS once and keep playing at the live edge —
  // adding/selecting one from the picker just reveals it (a role/rect change),
  // never a fresh hls.js load, so there is no reload jump or desync.
  //
  // ponytail: every stage camera streams from page load. Fine for the handful a
  // stage has; cap or lower-rendition the hidden ones if a big stage hurts
  // bandwidth/CPU.
  return (
    <div ref={stageRef} className={styles.stage} data-mode={effectiveMode}>
      {!mainCamera && <div className={styles.emptyState}>{t('noActiveCamera')}</div>}
      {pickerOpen && mainCamera && (
        <CameraDrawer
          cameras={cameras}
          activeCameraIds={activeCameraIds}
          librasCameraId={librasCameraId}
          effectiveMode={effectiveMode}
          onViewModeChange={onViewModeChange}
          onToggleCamera={onToggleCamera}
          onClose={onClosePicker}
        />
      )}
      {cameras.map((cam) => {
        const slot = layouts.get(cam.cameraId) ?? { role: 'hidden' as Role, style: HIDDEN_STYLE };
        const { role } = slot;
        const isPrimary = !!mainCamera && cam.cameraId === mainCamera.cameraId;
        const clickable = role === 'pip' || role === 'rail' || role === 'grid';

        const isActiveCam = activeCameraIds.includes(cam.cameraId);

        const onStripSelect = () => {
          if (!isActiveCam) onToggleCamera(cam.cameraId);
          onMainCameraChange(cam.cameraId);
        };

        const onSelect = clickable
          ? () => {
              onMainCameraChange(cam.cameraId);
              if (effectiveMode === 'grid') onViewModeChange('main-rail');
            }
          : undefined;

        const onMutedChange = (wantMuted: boolean) => {
          if (!wantMuted) onAudioCameraChange(cam.cameraId);
          else if (isPrimary) onGlobalMutedChange(true);
        };

        return (
          <div
            key={cam.cameraId}
            className={`${styles.slot} ${roleClass[role]}`}
            style={slot.style}
            onClick={role === 'strip' ? onStripSelect : undefined}
            {...(role === 'strip'
              ? {
                  role: 'button' as const,
                  tabIndex: 0,
                  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onStripSelect();
                    }
                  },
                }
              : {})}
          >
            <VideoPanel
              camera={cam}
              onSelect={role === 'strip' ? undefined : onSelect}
              // Focus (and its live-edge seek) tracks the MAIN video only. Do
              // not couple it to audioCameraId: selecting a non-main camera as
              // the audio source would flip isFocused → trigger a currentTime
              // jump to the live edge → brief stall + audible desync. The audio
              // panel keeps riding live via maxLiveSyncPlaybackRate, no seek.
              isFocused={role === 'main'}
              showLabel={role !== 'main' && role !== 'hidden' && role !== 'strip' && role !== 'libras'}
              showMuteButton={role === 'grid'}
              fit={role === 'pip' || role === 'rail' || role === 'strip' || role === 'libras' ? 'cover' : 'contain'}
              // Audio comes from the main element's selected alternate-audio
              // track (hls.audioTrack), not from unmuting a background element.
              muted={globalMuted || !isPrimary}
              selectedAudioCameraId={isPrimary ? audioCameraId ?? undefined : undefined}
              onMutedChange={onMutedChange}
              onAutoplayBlocked={onAutoplayBlocked ?? (() => onGlobalMutedChange(true))}
              clockRole={mode === 'live' ? (isPrimary ? 'master' : 'follower') : undefined}
              clockRef={clockRef}
              volume={volume}
              selectedLevel={selectedLevel}
              // In-player panels stay full quality even when hidden/small: any
              // of them can be promoted to main, and forcing a rendition switch
              // on promote (low → full) flushes the buffer and stalls ~1s. Only
              // the camera-strip previews (never the playback source) go low.
              onLevelsReady={isPrimary ? onLevelsReady : undefined}
              onAspectRatioReady={handleAspectRatioReady}
              mode={mode}
              paused={paused}
              positionMs={positionMs}
              // Cobertura é POR CÂMERA de propósito: é o que permite a este
              // painel traduzir o instante absoluto do evento para o tempo
              // local dele — e mostrar placeholder, em vez de buscar uma
              // posição que a mídia dele não cobre, quando não há tradução.
              coverage={cam.coverage}
              dvrActive={dvrActive}
              // Replay: every active panel seeks together (each camera is its
              // own VOD timeline starting at 0, so the same offset is right).
              // Live: only the camera the command was ISSUED FOR may apply it —
              // the cameras' media timelines are unrelated, so the offset is
              // meaningless anywhere else, and the promoted-primary paths
              // (click-to-promote, or the picker deselecting the current main)
              // would otherwise hand a stale offset to a different timeline.
              // The other panels already converge on the primary's
              // PROGRAM-DATE-TIME through use-clock-sync, which handles a DVR
              // jump as an ordinary (large) drift correction. Seeking them
              // directly here would be a second, conflicting sync mechanism.
              seekCommand={mode === 'live' && seekCommand?.cameraId !== cam.cameraId ? null : seekCommand}
              isTimeSource={isPrimary}
              onProgress={isPrimary ? onProgress : undefined}
              onEnded={isPrimary ? onEnded : undefined}
            />
            {role === 'strip' && (
              <>
                <span className={styles.stripAdd}>{t('addCamera')}</span>
                <div className={styles.stripInfo}>
                  <p className={styles.stripName}>{cam.name}</p>
                  <p className={styles.stripAngle}>{cam.slug}</p>
                </div>
              </>
            )}
            {role === 'libras' && (
              <span className={styles.librasBadge}>
                <HandMetal size={12} /> LIBRAS
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
