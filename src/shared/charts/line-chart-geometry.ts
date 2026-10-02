// Geometry for LineChart, kept apart from the component so the curve can be
// tested without a DOM. All coordinates are in a 0..100 box on both axes: the
// SVG is drawn with preserveAspectRatio="none", so the viewBox never has to
// know the real pixel size of the card.
export const BOX = 100;

export interface Domain {
  min: number;
  max: number;
}

export interface LineGeometry {
  /** Stroke path: the curve itself. */
  line: string;
  /** Fill path: the same curve closed down to the baseline. */
  area: string;
  /** Point positions in percent, for HTML overlays (dot, hover rail). */
  points: Array<{ x: number; y: number }>;
}

// The top is padded so the peak never touches the card edge.
const TOP_PAD = 8;

/** One scale for every series in a chart, always including zero. */
export function sharedDomain(series: number[][]): Domain {
  const all = series.flat();
  return { min: Math.min(0, ...all), max: Math.max(0, ...all) };
}

export function lineGeometry(data: number[], domain: Domain = sharedDomain([data])): LineGeometry | null {
  if (data.length === 0) return null;

  const span = domain.max - domain.min;
  const points = data.map((value, i) => ({
    // A single point sits in the middle instead of dividing by zero.
    x: data.length === 1 ? BOX / 2 : (i / (data.length - 1)) * BOX,
    // No variation at all (all zeros is the common one) draws along the
    // baseline rather than through the middle of an invented scale.
    y: span === 0 ? BOX : BOX - ((value - domain.min) / span) * (BOX - TOP_PAD),
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

/**
 * Which x labels to print. A day of hourly samples has 24 labels and they
 * cannot all fit under a card, so this keeps at most `max`, always including
 * the first and the last, spread evenly between them.
 */
export function visibleLabelIndexes(count: number, max = 7): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => Math.round(i * step));
}

function r(n: number): number {
  return Math.round(n * 100) / 100;
}
