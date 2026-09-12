import type { CSSProperties } from 'react';
import type { LiveCamera } from '../types/live.types';

// Pure slot-layout engine for CameraGrid: given the stage size and the current
// composition, decide each camera's ROLE and absolute rect. No React, no DOM.
//
// Every camera is treated as 16:9 — the four layouts are fixed shapes:
//   1x1   solo            main fills the stage
//   2x1   main + PiP      one other camera, floating bottom-right
//   1x[2] main + rail     two (or three) other cameras stacked on the right
//   2x2   grid            exactly four cameras, equal cells

export type ViewMode = 'solo' | 'main-rail' | 'grid';

export const ASPECT = 16 / 9;
// Composition cap (Libras excluded): the four layouts stop at 2x2.
export const MAX_ACTIVE_CAMERAS = 4;
// Rail tiles are sized from the stage height; on a narrow (portrait) stage
// that would eat the main view, so the rail never takes more than this.
export const RAIL_MAX_W_RATIO = 0.35;

// Which layout actually renders: one camera is always solo, and the 2x2 grid
// only exists with four — with fewer, "grid" degrades to main + rail
// (3 → 1x[2], 2 → PiP).
export function resolveEffectiveMode(viewMode: ViewMode, compositionCount: number): ViewMode {
  if (compositionCount <= 1) return 'solo';
  if (viewMode === 'grid' && compositionCount < MAX_ACTIVE_CAMERAS) return 'main-rail';
  return viewMode;
}
export type Role = 'main' | 'pip' | 'rail' | 'grid' | 'strip' | 'libras' | 'hidden';

export interface Slot {
  role: Role;
  style: CSSProperties;
}

export const PIP_W = 220;
export const PIP_H = PIP_W / ASPECT;
export const PIP_RIGHT = 16;
export const PIP_BOTTOM = 88; // clears LivePlayer's floating bottom stack (5.5rem)
export const GAP = 2;

// Right picker drawer (MULTICAM). Floats over the right edge of the stage;
// thumbnails stack vertically inside, reusing the persistent panels.
export const DRAWER_W = 220;        // drawer width (px)
export const DRAWER_HEADER_H = 52;  // header row (title + modes + close)
export const DRAWER_PAD = 12;
export const DRAWER_BOTTOM = 96;    // clear the floating transport bar at the bottom
export const DRAWER_ROW_H = 44;     // active-camera placeholder row height in the drawer

// Off-screen-but-alive: opacity 0 (not visibility:hidden / display:none, which
// browsers throttle or pause) so a hidden camera keeps decoding at the live
// edge and reveals in sync when it becomes a PIP/rail/main — no reload jump.
export const HIDDEN_STYLE = { inset: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 } as const;

export interface SlotLayoutParams {
  size: { width: number; height: number };
  effectiveMode: ViewMode;
  // Every stage camera (drawer add-tiles come from the inactive ones).
  cameras: LiveCamera[];
  activeCameraIds: string[];
  // Active cameras minus the Libras window — what main/rail/grid compose.
  compositionCameras: LiveCamera[];
  otherCameras: LiveCamera[];
  mainCamera: LiveCamera | null;
  librasCamera: LiveCamera | null;
  pickerOpen: boolean;
}

// 16:9 tile that fits `n` stacked copies in the stage height, capped to a
// share of the width. Returns the tile and the block's vertical offset.
function railTile(stageW: number, H: number, n: number) {
  let tileH = Math.max(0, (H - (n - 1) * GAP) / n);
  let tileW = tileH * ASPECT;
  const maxW = stageW * RAIL_MAX_W_RATIO;
  if (tileW > maxW) {
    tileW = maxW;
    tileH = tileW / ASPECT;
  }
  const blockH = tileH * n + (n - 1) * GAP;
  return { tileW, tileH, top: Math.max(0, (H - blockH) / 2) };
}

export function computeSlotLayout({
  size,
  effectiveMode,
  cameras,
  activeCameraIds,
  compositionCameras,
  otherCameras,
  mainCamera,
  librasCamera,
  pickerOpen,
}: SlotLayoutParams): Map<string, Slot> {
  const map = new Map<string, Slot>();
  const { width: W, height: H } = size;

  // Picker open: the active-camera composition is inset to the LEFT of the
  // drawer (so mode changes preview live in the stage); INACTIVE cameras are
  // shown as add-tiles inside the drawer on the right.
  const drawerInset = pickerOpen ? DRAWER_W : 0;
  const stageW = W - drawerInset;

  if (effectiveMode === 'grid') {
    // 2x2 of equal 16:9 cells, bound by whichever of width/height is tighter,
    // block centered in the stage.
    const cellW = Math.max(0, Math.min((stageW - GAP) / 2, ((H - GAP) / 2) * ASPECT));
    const cellH = cellW / ASPECT;
    const x0 = Math.max(0, (stageW - (cellW * 2 + GAP)) / 2);
    const y0 = Math.max(0, (H - (cellH * 2 + GAP)) / 2);
    compositionCameras.forEach((c, i) => {
      if (i >= 4) {
        map.set(c.cameraId, { role: 'hidden', style: HIDDEN_STYLE });
        return;
      }
      map.set(c.cameraId, {
        role: 'grid',
        style: {
          left: x0 + (i % 2) * (cellW + GAP),
          top: y0 + Math.floor(i / 2) * (cellH + GAP),
          width: cellW,
          height: cellH,
          zIndex: 0,
        },
      });
    });
  } else {
    // solo / main-rail
    const railPresent = effectiveMode !== 'solo' && otherCameras.length >= 2;
    const pipPresent = effectiveMode !== 'solo' && otherCameras.length === 1;
    const rail = railPresent ? railTile(stageW, H, otherCameras.length) : null;

    if (mainCamera) {
      map.set(mainCamera.cameraId, {
        role: 'main',
        style: { left: 0, top: 0, right: drawerInset + (rail ? rail.tileW + GAP : 0), bottom: 0, zIndex: 0 },
      });
    }

    if (effectiveMode === 'solo') {
      for (const c of otherCameras) {
        map.set(c.cameraId, { role: 'hidden', style: HIDDEN_STYLE });
      }
    } else if (pipPresent) {
      // If a Libras window owns the bottom-right, stack this PiP above it.
      const pipBottom = librasCamera ? PIP_BOTTOM + PIP_H + GAP : PIP_BOTTOM;
      map.set(otherCameras[0].cameraId, {
        role: 'pip',
        style: { right: PIP_RIGHT + drawerInset, bottom: pipBottom, width: PIP_W, height: PIP_H, zIndex: 21 },
      });
    } else if (rail) {
      otherCameras.forEach((c, i) => {
        map.set(c.cameraId, {
          role: 'rail',
          style: {
            right: drawerInset, top: rail.top + i * (rail.tileH + GAP), width: rail.tileW, height: rail.tileH,
            zIndex: 1, visibility: H > 0 ? 'visible' : 'hidden',
          },
        });
      });
    }
  }

  // NBR 15290: the Libras window is ALWAYS pinned bottom-right, above every
  // other layer, in every mode (solo / main-rail / grid). Set last so it wins
  // over any composition slot.
  if (librasCamera) {
    map.set(librasCamera.cameraId, {
      role: 'libras',
      style: {
        right: PIP_RIGHT + drawerInset,
        bottom: PIP_BOTTOM,
        width: PIP_W,
        height: PIP_H,
        zIndex: 24,
      },
    });
  }

  // Inactive cameras → drawer add-tiles (video thumbnails), stacked BELOW the
  // active-camera placeholder rows (which are chrome, rendered in the drawer).
  if (pickerOpen) {
    const inactive = cameras.filter((c) => !activeCameraIds.includes(c.cameraId));
    const tileW = DRAWER_W - DRAWER_PAD * 2;
    const tileH = Math.round(tileW / ASPECT);
    const rowsBottom = DRAWER_HEADER_H + activeCameraIds.length * DRAWER_ROW_H;
    const avail = H - rowsBottom - DRAWER_BOTTOM;
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
          top: rowsBottom + i * (tileH + GAP),
          width: tileW,
          height: tileH,
          zIndex: 22,
          visibility: H > 0 ? 'visible' : 'hidden',
        },
      });
    });
  }

  return map;
}
