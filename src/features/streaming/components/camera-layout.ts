import type { CSSProperties } from 'react';
import type { LiveCamera } from '../types/live.types';
import { computeJustifiedRows, pickColumnCount } from './justified-grid';

// Pure slot-layout engine for CameraGrid: given the stage size and the current
// composition, decide each camera's ROLE and absolute rect. No React, no DOM —
// unit-testable next to justified-grid.ts.

export type ViewMode = 'solo' | 'main-rail' | 'grid';
export type Role = 'main' | 'pip' | 'rail' | 'grid' | 'strip' | 'libras' | 'hidden';

export interface Slot {
  role: Role;
  style: CSSProperties;
}

// Layout constants (previously split across MainRailView/CameraRail/PipOverlay).
export const RAIL_W = 240;
export const PIP_W = 220;
export const PIP_H = (PIP_W * 9) / 16;
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
  // Real video aspect ratios by cameraId, used to row-justify the grid.
  aspectRatios: Record<string, number>;
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

export function computeSlotLayout({
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
}: SlotLayoutParams): Map<string, Slot> {
  const map = new Map<string, Slot>();
  const { width: W, height: H } = size;

  // Picker open: the active-camera composition is inset to the LEFT of the
  // drawer (so mode changes preview live in the stage); INACTIVE cameras are
  // shown as add-tiles inside the drawer on the right.
  const drawerInset = pickerOpen ? DRAWER_W : 0;
  const stageW = W - drawerInset;

  if (effectiveMode === 'grid') {
    const cols = pickColumnCount(compositionCameras.length);
    const rows = Math.max(1, Math.ceil(compositionCameras.length / cols));
    const jrows = computeJustifiedRows(
      compositionCameras.map((c) => c.cameraId), aspectRatios, cols, rows, stageW, H, GAP,
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
    for (const c of compositionCameras) {
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
      // If a Libras window owns the bottom-right, stack this PiP above it.
      const pipBottom = librasCamera ? PIP_BOTTOM + PIP_H + GAP : PIP_BOTTOM;
      map.set(otherCameras[0].cameraId, {
        role: 'pip',
        style: { right: PIP_RIGHT + drawerInset, bottom: pipBottom, width: PIP_W, height: PIP_H, zIndex: 21 },
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
    const tileH = Math.round((tileW * 9) / 16);
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
