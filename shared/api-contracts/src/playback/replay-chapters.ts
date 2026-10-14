import type { ReplayChapter, ReplayEventTimeline } from './types';

// The server keeps absolute instants even if the replay window later shrinks
// (reprocessed recording); the clamp to the current timeline happens here.
export function visibleChapters(
  chapters: ReplayChapter[],
  stageId: string | null,
  timeline: ReplayEventTimeline,
): ReplayChapter[] {
  return chapters
    .filter((c) => c.stageId === null || c.stageId === stageId)
    .filter((c) => c.endsAtMs > timeline.startsAtMs && c.startsAtMs < timeline.endsAtMs)
    .map((c) => ({
      ...c,
      startsAtMs: Math.max(c.startsAtMs, timeline.startsAtMs),
      endsAtMs: Math.min(c.endsAtMs, timeline.endsAtMs),
    }))
    .sort((a, b) => a.startsAtMs - b.startsAtMs);
}

// [start, end). At most one match: the server forbids overlaps within what a
// single viewer can see.
export function chapterAt(chapters: ReplayChapter[], atMs: number): ReplayChapter | null {
  return chapters.find((c) => atMs >= c.startsAtMs && atMs < c.endsAtMs) ?? null;
}
