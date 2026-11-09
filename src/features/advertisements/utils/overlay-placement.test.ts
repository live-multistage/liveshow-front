import { describe, expect, it } from 'vitest';
import { resolveOverlayPlacement, OVERLAY_INSET_PX, type OverlayPlacementInput } from './overlay-placement';

const base: OverlayPlacementInput = {
  position: 'TOP',
  isPhone: false,
  chatOpen: false,
  chaptersOpen: false,
  cameraDrawerOpen: false,
  hasLibras: false,
  hasPip: false,
  fullscreen: false,
};
const resolve = (over: Partial<OverlayPlacementInput> = {}) => resolveOverlayPlacement({ ...base, ...over });

describe('resolveOverlayPlacement', () => {
  it.each(['TOP', 'BOTTOM', 'SIDE'] as const)('keeps %s on a free desktop player', (position) => {
    expect(resolve({ position })).toEqual({ position, insetPx: 0, hidden: false, raised: false });
  });

  it('stops at the chat edge (320px + 20px margin)', () => {
    expect(resolve({ chatOpen: true }).insetPx).toBe(OVERLAY_INSET_PX.chat);
    expect(OVERLAY_INSET_PX.chat).toBe(340);
  });

  it('stops at the chapters drawer and the camera drawer edge', () => {
    expect(resolve({ chaptersOpen: true }).insetPx).toBe(352);
    expect(resolve({ cameraDrawerOpen: true }).insetPx).toBe(220);
  });

  it('takes the widest open panel when more than one is open', () => {
    expect(resolve({ chatOpen: true, cameraDrawerOpen: true }).insetPx).toBe(340);
  });

  it('drops SIDE to TOP when Libras and PiP are stacked', () => {
    expect(resolve({ position: 'SIDE', hasLibras: true, hasPip: true }).position).toBe('TOP');
  });

  it('keeps SIDE with only Libras or only the PiP', () => {
    expect(resolve({ position: 'SIDE', hasLibras: true }).position).toBe('SIDE');
    expect(resolve({ position: 'SIDE', hasPip: true }).position).toBe('SIDE');
  });

  it('does not move TOP/BOTTOM for Libras + PiP', () => {
    expect(resolve({ position: 'BOTTOM', hasLibras: true, hasPip: true }).position).toBe('BOTTOM');
  });

  it('raises BOTTOM in fullscreen, to clear the recommended pill', () => {
    expect(resolve({ position: 'BOTTOM', fullscreen: true }).raised).toBe(true);
    expect(resolve({ position: 'TOP', fullscreen: true }).raised).toBe(false);
  });

  describe('phone', () => {
    it('shows SIDE as BOTTOM', () => {
      expect(resolve({ position: 'SIDE', isPhone: true }).position).toBe('BOTTOM');
    });

    it('keeps TOP and BOTTOM', () => {
      expect(resolve({ position: 'TOP', isPhone: true }).position).toBe('TOP');
      expect(resolve({ position: 'BOTTOM', isPhone: true }).position).toBe('BOTTOM');
    });

    it('hides while the chat (full screen on phones) is open', () => {
      expect(resolve({ isPhone: true, chatOpen: true }).hidden).toBe(true);
    });

    it('never insets: panels are sheets, not side columns', () => {
      expect(resolve({ isPhone: true, chaptersOpen: true, cameraDrawerOpen: true }).insetPx).toBe(0);
    });

    it('is not raised by fullscreen', () => {
      expect(resolve({ isPhone: true, position: 'BOTTOM', fullscreen: true }).raised).toBe(false);
    });
  });
});
