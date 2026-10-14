import { test, expect } from 'vitest';
import { chapterAt, visibleChapters } from './replay-chapters';
import type { ReplayChapter } from './types';

const chapter = (id: string, stageId: string | null, startsAtMs: number, endsAtMs: number): ReplayChapter => ({
  id,
  stageId,
  startsAtMs,
  endsAtMs,
  title: id,
  description: null,
  artists: [],
});

const timeline = { startsAtMs: 1000, endsAtMs: 9000 };

test('a stage viewer sees event-wide chapters plus their own stage, sorted by start', () => {
  const chapters = [chapter('b', 'stage-b', 2000, 3000), chapter('a2', 'stage-a', 4000, 5000), chapter('all', null, 1000, 2000)];
  expect(visibleChapters(chapters, 'stage-a', timeline).map((c) => c.id)).toEqual(['all', 'a2']);
});

test('without a current stage only event-wide chapters are visible', () => {
  const chapters = [chapter('a', 'stage-a', 2000, 3000), chapter('all', null, 1000, 2000)];
  expect(visibleChapters(chapters, null, timeline).map((c) => c.id)).toEqual(['all']);
});

test('chapters are clamped to the timeline and dropped when wholly outside it', () => {
  const chapters = [chapter('early', null, 0, 500), chapter('edge', null, 500, 1500), chapter('late', null, 8500, 12000)];
  const visible = visibleChapters(chapters, null, timeline);
  expect(visible.map((c) => [c.id, c.startsAtMs, c.endsAtMs])).toEqual([
    ['edge', 1000, 1500],
    ['late', 8500, 9000],
  ]);
});

test('chapterAt uses [start, end) and returns null in a gap', () => {
  const chapters = [chapter('one', null, 1000, 2000), chapter('two', null, 3000, 4000)];
  expect(chapterAt(chapters, 1000)?.id).toBe('one');
  expect(chapterAt(chapters, 2000)).toBeNull();
  expect(chapterAt(chapters, 3500)?.id).toBe('two');
});
