import { describe, it, expect } from 'vitest';
import { computeSlotLayout, resolveEffectiveMode, GAP, PIP_W, PIP_H } from './camera-layout';
import type { LiveCamera } from '../types/live.types';

const cam = (id: string): LiveCamera => ({ cameraId: id, name: id, slug: id, hlsUrl: '' } as unknown as LiveCamera);

function layout(ids: string[], mode: 'solo' | 'main-rail' | 'grid', size = { width: 1600, height: 900 }) {
  const cameras = ids.map(cam);
  const [main, ...others] = cameras;
  return computeSlotLayout({
    size,
    effectiveMode: mode,
    cameras,
    activeCameraIds: ids,
    compositionCameras: cameras,
    otherCameras: others,
    mainCamera: main ?? null,
    librasCamera: null,
    pickerOpen: false,
  });
}

const num = (v: unknown) => Number(v);

describe('resolveEffectiveMode', () => {
  it('is solo with one camera regardless of the requested mode', () => {
    expect(resolveEffectiveMode('grid', 1)).toBe('solo');
    expect(resolveEffectiveMode('main-rail', 0)).toBe('solo');
  });
  it('only allows the 2x2 grid with 4 cameras; fewer fall back to main + rail', () => {
    expect(resolveEffectiveMode('grid', 4)).toBe('grid');
    expect(resolveEffectiveMode('grid', 3)).toBe('main-rail');
    expect(resolveEffectiveMode('grid', 2)).toBe('main-rail');
  });
  it('keeps solo and main-rail as requested', () => {
    expect(resolveEffectiveMode('solo', 3)).toBe('solo');
    expect(resolveEffectiveMode('main-rail', 4)).toBe('main-rail');
  });
});

describe('computeSlotLayout — fixed 16:9 layouts', () => {
  it('1x1: the main camera fills the stage', () => {
    const m = layout(['a'], 'solo');
    expect(m.get('a')?.role).toBe('main');
    expect(m.get('a')?.style).toMatchObject({ left: 0, top: 0, right: 0, bottom: 0 });
  });

  it('2x1: main + a 16:9 PiP', () => {
    const m = layout(['a', 'b'], 'main-rail');
    expect(m.get('a')?.style.right).toBe(0);
    const pip = m.get('b')!;
    expect(pip.role).toBe('pip');
    expect(num(pip.style.width) / num(pip.style.height)).toBeCloseTo(16 / 9, 5);
    expect(pip.style.width).toBe(PIP_W);
    expect(pip.style.height).toBe(PIP_H);
  });

  it('1x[2]: two 16:9 rail tiles sized from the stage height; main takes the rest', () => {
    // Short stage: height-bound (2 tiles of 299px → 531px wide < 35% of 1600).
    const m = layout(['a', 'b', 'c'], 'main-rail', { width: 1600, height: 600 });
    const tileH = (600 - GAP) / 2;
    const tileW = tileH * (16 / 9);
    for (const id of ['b', 'c']) {
      const s = m.get(id)!;
      expect(s.role).toBe('rail');
      expect(num(s.style.width)).toBeCloseTo(tileW, 3);
      expect(num(s.style.height)).toBeCloseTo(tileH, 3);
      expect(s.style.right).toBe(0);
    }
    expect(m.get('b')?.style.top).toBe(0);
    expect(num(m.get('c')?.style.top)).toBeCloseTo(tileH + GAP, 3);
    expect(num(m.get('a')?.style.right)).toBeCloseTo(tileW + GAP, 3);
  });

  it('1x[2]: the rail is capped to 35% of the width (16:9 kept, block centered) so the main stays dominant', () => {
    for (const size of [{ width: 1600, height: 900 }, { width: 400, height: 800 }]) {
      const m = layout(['a', 'b', 'c'], 'main-rail', size);
      const tileW = size.width * 0.35;
      const tileH = tileW * (9 / 16);
      const s = m.get('b')!;
      expect(num(s.style.width)).toBeCloseTo(tileW, 3);
      expect(num(s.style.height)).toBeCloseTo(tileH, 3);
      const blockH = tileH * 2 + GAP;
      expect(num(s.style.top)).toBeCloseTo((size.height - blockH) / 2, 3);
      expect(num(m.get('a')?.style.right)).toBeCloseTo(tileW + GAP, 3);
    }
  });

  it('main + 3 rail tiles with 4 cameras in main-rail', () => {
    const m = layout(['a', 'b', 'c', 'd'], 'main-rail', { width: 1600, height: 600 });
    const tileH = (600 - 2 * GAP) / 3;
    expect(num(m.get('d')?.style.height)).toBeCloseTo(tileH, 3);
    expect(num(m.get('d')?.style.top)).toBeCloseTo(2 * (tileH + GAP), 3);
  });

  it('2x2: four equal 16:9 cells, centered in the stage', () => {
    const m = layout(['a', 'b', 'c', 'd'], 'grid', { width: 1600, height: 900 });
    // height-bound: ((900-2)/2)*16/9 = 798.2 < (1600-2)/2 = 799
    const cellW = ((900 - GAP) / 2) * (16 / 9);
    const cellH = cellW * (9 / 16);
    const x0 = (1600 - (cellW * 2 + GAP)) / 2;
    const y0 = (900 - (cellH * 2 + GAP)) / 2;
    const expected: Record<string, [number, number]> = {
      a: [x0, y0], b: [x0 + cellW + GAP, y0], c: [x0, y0 + cellH + GAP], d: [x0 + cellW + GAP, y0 + cellH + GAP],
    };
    for (const [id, [left, top]] of Object.entries(expected)) {
      const s = m.get(id)!;
      expect(s.role).toBe('grid');
      expect(num(s.style.left)).toBeCloseTo(left, 3);
      expect(num(s.style.top)).toBeCloseTo(top, 3);
      expect(num(s.style.width) / num(s.style.height)).toBeCloseTo(16 / 9, 5);
    }
  });

  it('2x2 on a wide-but-short stage is width-bound', () => {
    const m = layout(['a', 'b', 'c', 'd'], 'grid', { width: 1000, height: 900 });
    const cellW = (1000 - GAP) / 2;
    expect(num(m.get('a')?.style.width)).toBeCloseTo(cellW, 3);
    expect(num(m.get('a')?.style.height)).toBeCloseTo(cellW * (9 / 16), 3);
  });
});
