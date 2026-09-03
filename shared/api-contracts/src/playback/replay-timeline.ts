import type { ReplaySegmentCoverage } from './types';

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
  for (const [i, stretch] of coverage.entries()) {
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
  for (const [i, stretch] of coverage.entries()) {
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
