import { describe, it, expect } from 'vitest';
import { BOX, indexAtRatio, sparklineGeometry } from './sparkline-path';

describe('sparklineGeometry', () => {
  it('returns nothing to draw for an empty series', () => {
    expect(sparklineGeometry([])).toBeNull();
  });

  it('spreads the samples across the full width', () => {
    const g = sparklineGeometry([1, 2, 3])!;
    expect(g.points.map((p) => p.x)).toEqual([0, 50, 100]);
  });

  it('puts the peak near the top and zero on the baseline', () => {
    const g = sparklineGeometry([0, 3, 0])!;
    expect(g.points[0].y).toBe(BOX);
    expect(g.points[1].y).toBeLessThan(10);
  });

  // The curve must never draw a value that did not happen: no overshoot above
  // the peak, none below zero between two zero months.
  it('never overshoots the data between samples', () => {
    const g = sparklineGeometry([0, 0, 0, 3, 0, 0])!;
    const ys = [...g.line.matchAll(/-?\d+(\.\d+)?/g)]
      .map((m) => Number(m[0]))
      .filter((_, i) => i % 2 === 1);
    const peak = Math.min(...g.points.map((p) => p.y));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(peak);
    expect(Math.max(...ys)).toBeLessThanOrEqual(BOX);
  });

  it('draws a flat series along the baseline, not through the middle', () => {
    const g = sparklineGeometry([0, 0, 0])!;
    expect(g.points.every((p) => p.y === BOX)).toBe(true);
  });

  it('centres a single sample instead of dividing by zero', () => {
    expect(sparklineGeometry([5])!.points[0].x).toBe(50);
  });

  it('closes the area down to the baseline', () => {
    expect(sparklineGeometry([1, 2])!.area).toMatch(/L 100 100 L 0 100 Z$/);
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
