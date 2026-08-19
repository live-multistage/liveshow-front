/**
 * A replay manifest stitches a camera's archived packages into one continuous
 * timeline, concatenating them WITHOUT the wall-clock gaps between reconnects.
 * So "local" (stitched) time is not linear in wall-clock ("absolute") time:
 * an outage vanishes from local time but still exists in absolute time.
 *
 * `coverage` describes the stretches that make up that mapping. An instant
 * that falls in a gap between stretches has no local time at all — callers
 * must treat that as "nothing to show" (placeholder, no seek/play), never
 * clamp it to the nearest edge, since a silent clamp reproduces the frozen
 * tile this type exists to avoid.
 */
export interface ReplaySegmentCoverage {
  startsAtMs: number; // absolute start of the stretch
  endsAtMs: number; // absolute end of the stretch
  localStartSec: number; // where this stretch begins on the stitched timeline
}

// Boundary convention: each stretch is [startsAtMs, endsAtMs) — inclusive
// start, exclusive end — except the very last stretch, whose endsAtMs is
// treated as inclusive so the final instant of the recording is reachable.
// ponytail: coverage is assumed pre-sorted by startsAtMs (as the backend
// produces it); callers that need out-of-order support should sort before
// calling in.

function isLast(coverage: ReplaySegmentCoverage[], index: number): boolean {
  return index === coverage.length - 1;
}

export function coverageAt(
  coverage: ReplaySegmentCoverage[],
  atMs: number,
): ReplaySegmentCoverage | null {
  for (let i = 0; i < coverage.length; i++) {
    const stretch = coverage[i];
    const withinStart = atMs >= stretch.startsAtMs;
    const withinEnd = isLast(coverage, i) ? atMs <= stretch.endsAtMs : atMs < stretch.endsAtMs;
    if (withinStart && withinEnd) return stretch;
  }
  return null;
}

export function absoluteToLocal(coverage: ReplaySegmentCoverage[], atMs: number): number | null {
  const stretch = coverageAt(coverage, atMs);
  if (!stretch) return null;
  return stretch.localStartSec + (atMs - stretch.startsAtMs) / 1000;
}

export function localToAbsolute(
  coverage: ReplaySegmentCoverage[],
  localSec: number,
): number | null {
  for (let i = 0; i < coverage.length; i++) {
    const stretch = coverage[i];
    const stretchLocalDurationSec = (stretch.endsAtMs - stretch.startsAtMs) / 1000;
    const localEndSec = stretch.localStartSec + stretchLocalDurationSec;
    const withinStart = localSec >= stretch.localStartSec;
    const withinEnd = isLast(coverage, i) ? localSec <= localEndSec : localSec < localEndSec;
    if (withinStart && withinEnd) {
      return stretch.startsAtMs + (localSec - stretch.localStartSec) * 1000;
    }
  }
  return null;
}
