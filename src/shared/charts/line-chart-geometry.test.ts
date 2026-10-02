import { describe, it, expect } from 'vitest';
import { BOX, indexAtRatio, lineGeometry, sharedDomain, visibleLabelIndexes } from './line-chart-geometry';

describe('lineGeometry', () => {
  it('returns nothing to draw for an empty series', () => {
    expect(lineGeometry([])).toBeNull();
  });

  it('spreads the samples across the full width', () => {
    const g = lineGeometry([1, 2, 3])!;
    expect(g.points.map((p) => p.x)).toEqual([0, 50, 100]);
  });

  it('puts the peak near the top and zero on the baseline', () => {
    const g = lineGeometry([0, 3, 0])!;
    expect(g.points[0].y).toBe(BOX);
    expect(g.points[1].y).toBeLessThan(10);
  });

  // The curve must never draw a value that did not happen: no overshoot above
  // the peak, none below zero between two zero months.
  it('never overshoots the data between samples', () => {
    const g = lineGeometry([0, 0, 0, 3, 0, 0])!;
    const ys = [...g.line.matchAll(/-?\d+(\.\d+)?/g)]
      .map((m) => Number(m[0]))
      .filter((_, i) => i % 2 === 1);
    const peak = Math.min(...g.points.map((p) => p.y));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(peak);
    expect(Math.max(...ys)).toBeLessThanOrEqual(BOX);
  });

  it('draws a flat series along the baseline, not through the middle', () => {
    const g = lineGeometry([0, 0, 0])!;
    expect(g.points.every((p) => p.y === BOX)).toBe(true);
  });

  it('centres a single sample instead of dividing by zero', () => {
    expect(lineGeometry([5])!.points[0].x).toBe(50);
  });

  it('closes the area down to the baseline', () => {
    expect(lineGeometry([1, 2])!.area).toMatch(/L 100 100 L 0 100 Z$/);
  });
});

describe('indexAtRatio', () => {
  it('maps a horizontal position to the nearest sample', () => {
    expect(indexAtRatio(0, 6)).toBe(0);
    expect(indexAtRatio(0.5, 6)).toBe(3);
    expect(indexAtRatio(1, 6)).toBe(5);
  });

  it('clamps positions outside the plot', () => {
    expect(indexAtRatio(-0.2, 6)).toBe(0);
    expect(indexAtRatio(1.4, 6)).toBe(5);
  });
});

describe('sharedDomain', () => {
  // Two series on one chart must share a scale, or a line of 3 and a line of
  // 300 would both touch the top and read as equal.
  it('spans every series and always includes zero', () => {
    expect(sharedDomain([[3, 5], [10, 1]])).toEqual({ min: 0, max: 10 });
    expect(sharedDomain([[-2, 4]])).toEqual({ min: -2, max: 4 });
  });

  it('draws the smaller series lower when the scale is shared', () => {
    const domain = sharedDomain([[10], [5]]);
    expect(lineGeometry([5], domain)!.points[0].y).toBeGreaterThan(lineGeometry([10], domain)!.points[0].y);
  });
});

describe('visibleLabelIndexes', () => {
  it('keeps every label when they fit', () => {
    expect(visibleLabelIndexes(6)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('thins a dense axis but always keeps the first and last label', () => {
    const shown = visibleLabelIndexes(24);
    expect(shown).toHaveLength(7);
    expect(shown[0]).toBe(0);
    expect(shown[shown.length - 1]).toBe(23);
  });
});
