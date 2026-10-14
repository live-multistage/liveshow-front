import type { ReplayChapter, ReplayEventTimeline } from '../types/live.types';

export interface TrackSegment {
  startsAtMs: number;
  endsAtMs: number;
  // Null = a stretch no chapter covers; drawn as a neutral segment.
  chapterId: string | null;
  leftPct: number;
  widthPct: number;
  fillPct: number;
  last: boolean;
}

const HOUR_MS = 3_600_000;
const clampPct = (n: number) => Math.min(100, Math.max(0, n));
const pad = (n: number) => String(n).padStart(2, '0');

export function chapterProgressPct(chapter: Pick<ReplayChapter, 'startsAtMs' | 'endsAtMs'>, positionMs: number): number {
  const length = chapter.endsAtMs - chapter.startsAtMs;
  if (length <= 0) return 0;
  return clampPct(((positionMs - chapter.startsAtMs) / length) * 100);
}

// Expects visibleChapters() output: sorted, clamped to the timeline and free
// of overlaps (the server forbids overlaps within what one viewer sees).
export function chapterTrackSegments(
  chapters: ReplayChapter[],
  timeline: ReplayEventTimeline,
  positionMs: number,
): TrackSegment[] {
  const span = timeline.endsAtMs - timeline.startsAtMs;
  if (span <= 0 || chapters.length === 0) return [];

  const ranges: { startsAtMs: number; endsAtMs: number; chapterId: string | null }[] = [];
  let cursor = timeline.startsAtMs;
  for (const c of chapters) {
    if (c.startsAtMs > cursor) ranges.push({ startsAtMs: cursor, endsAtMs: c.startsAtMs, chapterId: null });
    ranges.push({ startsAtMs: c.startsAtMs, endsAtMs: c.endsAtMs, chapterId: c.id });
    cursor = Math.max(cursor, c.endsAtMs);
  }
  if (cursor < timeline.endsAtMs) ranges.push({ startsAtMs: cursor, endsAtMs: timeline.endsAtMs, chapterId: null });

  return ranges.map((r, i) => ({
    ...r,
    leftPct: ((r.startsAtMs - timeline.startsAtMs) / span) * 100,
    widthPct: ((r.endsAtMs - r.startsAtMs) / span) * 100,
    fillPct: chapterProgressPct(r, positionMs),
    last: i === ranges.length - 1,
  }));
}

// Offset from the replay start. Hours only appear when the replay is long
// enough to need them, so every label in one replay has the same shape.
export function formatClock(ms: number, spanMs: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return spanMs >= HOUR_MS ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function chapterDuration(ms: number): { unit: 'min' | 's'; count: number } {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? { unit: 's', count: seconds } : { unit: 'min', count: Math.round(seconds / 60) };
}

export function pointerToMs(clientX: number, left: number, width: number, min: number, max: number): number {
  if (width <= 0) return min;
  const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
  return Math.round(min + ratio * (max - min));
}
