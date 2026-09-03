import { describe, expect, it } from 'vitest';
import { groupAccessibleEvents, hasPhysicalEntry } from './group';
import type { AccessibleEvent } from './types';

const NOW = new Date('2026-08-29T20:00:00.000Z');

function ev(over: Partial<AccessibleEvent>): AccessibleEvent {
  return {
    id: 'e1',
    title: 'Show',
    status: 'PUBLISHED',
    startsAt: '2026-09-10T20:00:00.000Z',
    endsAt: '2026-09-10T23:00:00.000Z',
    thumbnailUrl: null,
    bannerUrl: null,
    venue: null,
    city: null,
    capabilities: ['LIVE_VIEW'],
    canWatchLive: false,
    canWatchReplay: false,
    ...over,
  };
}

describe('groupAccessibleEvents', () => {
  it('puts a LIVE event in live regardless of its clock window', () => {
    const live = ev({ id: 'live', status: 'LIVE', startsAt: '2026-08-29T18:00:00.000Z', endsAt: '2026-08-29T19:00:00.000Z' });
    const groups = groupAccessibleEvents([live], NOW);
    expect(groups.live.map((e) => e.id)).toEqual(['live']);
    expect(groups.past).toEqual([]);
  });

  it('splits the rest by endsAt against now', () => {
    const past = ev({ id: 'past', endsAt: '2026-08-01T23:00:00.000Z', startsAt: '2026-08-01T20:00:00.000Z' });
    const soon = ev({ id: 'soon' });
    const groups = groupAccessibleEvents([past, soon], NOW);
    expect(groups.upcoming.map((e) => e.id)).toEqual(['soon']);
    expect(groups.past.map((e) => e.id)).toEqual(['past']);
  });

  // Upcoming reads as a countdown (soonest first); past reads as a history
  // (most recent first). Sorting both the same way would bury the event the
  // user just attended at the bottom of a long list.
  it('sorts upcoming ascending and past descending', () => {
    const a = ev({ id: 'a', startsAt: '2026-09-01T20:00:00.000Z', endsAt: '2026-09-01T22:00:00.000Z' });
    const b = ev({ id: 'b', startsAt: '2026-09-05T20:00:00.000Z', endsAt: '2026-09-05T22:00:00.000Z' });
    const x = ev({ id: 'x', startsAt: '2026-07-01T20:00:00.000Z', endsAt: '2026-07-01T22:00:00.000Z' });
    const y = ev({ id: 'y', startsAt: '2026-08-10T20:00:00.000Z', endsAt: '2026-08-10T22:00:00.000Z' });
    const groups = groupAccessibleEvents([b, a, x, y], NOW);
    expect(groups.upcoming.map((e) => e.id)).toEqual(['a', 'b']);
    expect(groups.past.map((e) => e.id)).toEqual(['y', 'x']);
  });

  it('never mutates the input array', () => {
    const list = [ev({ id: 'b', startsAt: '2026-09-05T20:00:00.000Z' }), ev({ id: 'a' })];
    groupAccessibleEvents(list, NOW);
    expect(list.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('returns three empty buckets for an empty list', () => {
    expect(groupAccessibleEvents([], NOW)).toEqual({ live: [], upcoming: [], past: [] });
  });
});

describe('hasPhysicalEntry', () => {
  it('is true only when PHYSICAL_ENTRY is present', () => {
    expect(hasPhysicalEntry(['PHYSICAL_ENTRY'])).toBe(true);
    expect(hasPhysicalEntry(['LIVE_VIEW', 'PHYSICAL_ENTRY'])).toBe(true);
    expect(hasPhysicalEntry(['LIVE_VIEW', 'REPLAY_VIEW'])).toBe(false);
    expect(hasPhysicalEntry([])).toBe(false);
  });
});
