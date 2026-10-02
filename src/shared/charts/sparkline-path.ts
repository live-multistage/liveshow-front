// Geometry for Sparkline, kept apart from the component so the curve can be
// tested without a DOM. All coordinates are in a 0..100 box on both axes: the
// SVG is drawn with preserveAspectRatio="none", so the viewBox never has to
// know the real pixel size of the card.
export const BOX = 100;

export interface SparklineGeometry {
  /** Stroke path: the curve itself. */
  line: string;
  /** Fill path: the same curve closed down to the baseline. */
  area: string;
  /** Point positions in percent, for HTML overlays (dot, hover rail). */
  points: Array<{ x: number; y: number }>;
}

// Y is inverted (SVG grows downward) and the top is padded, so the peak never
// touches the card edge and a flat series still reads as a line rather than a
// border.
const TOP_PAD = 8;

export function sparklineGeometry(data: number[]): SparklineGeometry | null {
  if (data.length === 0) return null;

  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const span = max - min;

  const points = data.map((value, i) => ({
    // A single point sits in the middle instead of dividing by zero.
    x: data.length === 1 ? BOX / 2 : (i / (data.length - 1)) * BOX,
    // A series with no variation (all zeros is the common one) draws along the
    // baseline rather than through the middle of an invented scale.
    y: span === 0 ? BOX : BOX - ((value - min) / span) * (BOX - TOP_PAD),
  }));

  const line = points.reduce((d, p, i) => {
    if (i === 0) return `M ${r(p.x)} ${r(p.y)}`;
    const prev = points[i - 1];
    // Horizontal-only control points: the curve eases between samples without
    // ever overshooting above the max or below the min, which a Catmull-Rom
    // spline does and which would show counts that never happened.
    const cx = (prev.x + p.x) / 2;
    return `${d} C ${r(cx)} ${r(prev.y)}, ${r(cx)} ${r(p.y)}, ${r(p.x)} ${r(p.y)}`;
  }, '');

  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L ${r(last.x)} ${BOX} L ${r(first.x)} ${BOX} Z`;

  return { line, area, points };
}

/** Index of the sample nearest to a 0..1 position across the plot. */
export function indexAtRatio(ratio: number, count: number): number {
  if (count <= 1) return 0;
  const clamped = Math.min(Math.max(ratio, 0), 1);
  return Math.round(clamped * (count - 1));
}

function r(n: number): number {
  return Math.round(n * 100) / 100;
}
