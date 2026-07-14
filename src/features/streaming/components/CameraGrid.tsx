'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { X, Square, PanelRight, LayoutGrid } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import type { QualityLevel } from './VideoPanel';
import { computeJustifiedRows, pickColumnCount } from './justified-grid';
import styles from './CameraGrid.module.scss';

export type { QualityLevel };
export type ViewMode = 'solo' | 'main-rail' | 'grid';

// Layout constants (previously split across MainRailView/CameraRail/PipOverlay).
const RAIL_W = 240;
const PIP_W = 220;
const PIP_H = (PIP_W * 9) / 16;
const PIP_RIGHT = 16;
const PIP_BOTTOM = 88; // clears LivePlayer's floating bottom stack (5.5rem)
const GAP = 2;

// Right picker drawer (MULTICAM). Floats over the right edge of the stage;
// thumbnails stack vertically inside, reusing the persistent panels.
const DRAWER_W = 300;        // drawer width (px)
const DRAWER_HEADER_H = 52;  // header row (title + modes + close)
const DRAWER_PAD = 12;
const DRAWER_BOTTOM = 96;    // clear the floating transport bar at the bottom

const MODES: { id: ViewMode; label: string; icon: typeof Square }[] = [
  { id: 'solo', label: 'Solo', icon: Square },
  { id: 'main-rail', label: 'Principal + trilha', icon: PanelRight },
  { id: 'grid', label: 'Grade', icon: LayoutGrid },
];

// Off-screen-but-alive: opacity 0 (not visibility:hidden / display:none, which
// browsers throttle or pause) so a hidden camera keeps decoding at the live
// edge and reveals in sync when it becomes a PIP/rail/main — no reload jump.
const HIDDEN_STYLE = { inset: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 } as const;

type Role = 'main' | 'pip' | 'rail' | 'grid' | 'strip' | 'hidden';
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
  audioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  volume: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  mainCameraId: string | null;
  onMainCameraChange: (cameraId: string) => void;
  activeCameraIds: string[];
  mode?: 'live' | 'replay';
  paused?: boolean;
  seekCommand?: { time: number; token: number } | null;
  onProgress?: (currentTime: number, duration: number) => void;
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
  pickerOpen = false,
  onToggleCamera = () => {},
  onClosePicker = () => {},
}: CameraGridProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

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

  const mainCamera = activeCameras.find((c) => c.cameraId === mainCameraId) ?? activeCameras[0] ?? null;
  const effectiveMode: ViewMode = activeCameras.length <= 1 ? 'solo' : viewMode;
  const otherCameras = mainCamera
    ? activeCameras.filter((c) => c.cameraId !== mainCamera.cameraId)
    : [];

  const layouts = useMemo<Map<string, Slot>>(() => {
    const map = new Map<string, Slot>();
    const { width: W, height: H } = size;

    // Picker open: the active-camera composition is inset to the LEFT of the
    // drawer (so mode changes preview live in the stage); INACTIVE cameras are
    // shown as add-tiles inside the drawer on the right.
    const drawerInset = pickerOpen ? DRAWER_W : 0;
    const stageW = W - drawerInset;

    if (effectiveMode === 'grid') {
      const cols = pickColumnCount(activeCameras.length);
      const rows = Math.max(1, Math.ceil(activeCameras.length / cols));
      const jrows = computeJustifiedRows(
        activeCameras.map((c) => c.cameraId), aspectRatios, cols, rows, stageW, H, GAP,
      );
      const totalH = jrows.reduce((a, r) => a + r.height, 0) + Math.max(0, jrows.length - 1) * GAP;
      let y = Math.max(0, (H - totalH) / 2);
      for (const row of jrows) {
        let x = Math.max(0, (stageW - row.width) / 2);
        for (const cell of row.cells) {
          if (cell.cameraId) {
            map.set(cell.cameraId, {
              role: 'grid',
              style: { left: x, top: y, width: cell.width, height: cell.height, zIndex: 0 },
            });
          }
          x += cell.width + GAP;
        }
        y += row.height + GAP;
      }
      for (const c of activeCameras) {
        if (!map.has(c.cameraId)) {
          map.set(c.cameraId, { role: 'hidden', style: HIDDEN_STYLE });
        }
      }
    } else {
      // solo / main-rail
      const railPresent = effectiveMode !== 'solo' && otherCameras.length >= 2;
      const pipPresent = effectiveMode !== 'solo' && otherCameras.length === 1;

      if (mainCamera) {
        map.set(mainCamera.cameraId, {
          role: 'main',
          style: { left: 0, top: 0, right: drawerInset + (railPresent ? RAIL_W : 0), bottom: 0, zIndex: 0 },
        });
      }

      if (effectiveMode === 'solo') {
        for (const c of otherCameras) {
          map.set(c.cameraId, { role: 'hidden', style: HIDDEN_STYLE });
        }
      } else if (pipPresent) {
        map.set(otherCameras[0].cameraId, {
          role: 'pip',
          style: { right: PIP_RIGHT + drawerInset, bottom: PIP_BOTTOM, width: PIP_W, height: PIP_H, zIndex: 21 },
        });
      } else if (railPresent) {
        const n = otherCameras.length;
        const tileH = H > 0 ? (H - (n - 1) * GAP) / n : 0;
        otherCameras.forEach((c, i) => {
          map.set(c.cameraId, {
            role: 'rail',
            style: {
              right: drawerInset, top: i * (tileH + GAP), width: RAIL_W, height: tileH,
              zIndex: 1, visibility: H > 0 ? 'visible' : 'hidden',
            },
          });
        });
      }
    }

    // Inactive cameras → drawer add-tiles (only while the picker is open).
    if (pickerOpen) {
      const inactive = cameras.filter((c) => !activeCameraIds.includes(c.cameraId));
      const tileW = DRAWER_W - DRAWER_PAD * 2;
      const tileH = Math.round((tileW * 9) / 16);
      const avail = H - DRAWER_HEADER_H - DRAWER_BOTTOM;
      const maxTiles = H > 0 ? Math.max(1, Math.floor((avail + GAP) / (tileH + GAP))) : inactive.length;
      inactive.forEach((c, i) => {
        if (i >= maxTiles) {
          map.set(c.cameraId, { role: 'hidden', style: HIDDEN_STYLE });
          return;
        }
        map.set(c.cameraId, {
          role: 'strip',
          style: {
            right: DRAWER_PAD,
            top: DRAWER_HEADER_H + i * (tileH + GAP),
            width: tileW,
            height: tileH,
            zIndex: 22,
            visibility: H > 0 ? 'visible' : 'hidden',
          },
        });
      });
    }

    return map;
  }, [effectiveMode, activeCameras, otherCameras, mainCamera, size, aspectRatios, pickerOpen, cameras, activeCameraIds]);

  const roleClass: Record<Role, string> = {
    main: styles.mainSlot,
    pip: styles.pipSlot,
    rail: styles.railSlot,
    grid: styles.gridSlot,
    strip: styles.stripSlot,
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
      {!mainCamera && <div className={styles.emptyState}>Nenhuma câmera ativa</div>}
      {pickerOpen && mainCamera && (
        <div className={styles.drawer} style={{ width: DRAWER_W, bottom: DRAWER_BOTTOM }}>
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitle}>
              <span className={styles.drawerLabel}>MULTICAM</span>
              <span className={styles.drawerCount}>{cameras.length}</span>
            </div>
            <div className={styles.drawerActions}>
              {activeCameraIds.length > 1 && (
                <div className={styles.drawerModes}>
                  {MODES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onViewModeChange(id)}
                      title={label}
                      aria-label={label}
                      className={`${styles.modeBtn} ${effectiveMode === id ? styles.modeBtnActive : ''}`}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className={styles.drawerClose}
                onClick={onClosePicker}
                aria-label="Fechar câmeras"
              >
                <X size={13} />
              </button>
            </div>
          </div>
          {cameras.every((c) => activeCameraIds.includes(c.cameraId)) && (
            <div className={styles.drawerEmpty}>Todas as câmeras já estão no ar</div>
          )}
        </div>
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
              showLabel={role !== 'main' && role !== 'hidden' && role !== 'strip'}
              showMuteButton={role === 'grid'}
              fit={role === 'pip' || role === 'rail' || role === 'strip' ? 'cover' : 'contain'}
              // Audio comes from the main element's selected alternate-audio
              // track (hls.audioTrack), not from unmuting a background element.
              muted={globalMuted || !isPrimary}
              selectedAudioCameraId={isPrimary ? audioCameraId ?? undefined : undefined}
              onMutedChange={onMutedChange}
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
              seekCommand={seekCommand}
              isTimeSource={isPrimary}
              onProgress={isPrimary ? onProgress : undefined}
              onEnded={isPrimary ? onEnded : undefined}
            />
            {role === 'strip' && (
              <>
                <span className={styles.stripAdd}>+ ADICIONAR</span>
                <div className={styles.stripInfo}>
                  <p className={styles.stripName}>{cam.name}</p>
                  <p className={styles.stripAngle}>{cam.slug}</p>
                </div>
              </>
            )}
            {pickerOpen &&
              (role === 'grid' || role === 'rail' || role === 'pip') &&
              isActiveCam &&
              activeCameraIds.length > 1 && (
                <button
                  type="button"
                  className={styles.stripClose}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCamera(cam.cameraId);
                  }}
                  aria-label={`Remover ${cam.name}`}
                >
                  <X size={11} />
                </button>
              )}
          </div>
        );
      })}
    </div>
  );
}
