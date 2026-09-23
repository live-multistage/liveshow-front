import { describe, expect, it } from 'vitest';
import type { NotificationResponse } from '../types/notification.types';
import { groupKeyFor, groupNotifications } from './notification-groups';

// Local-time boundaries: "now" is 2026-09-23 00:30 local, so anything from the
// previous calendar day is "yesterday" even when only minutes apart.
const now = new Date(2026, 8, 23, 0, 30);
const local = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

const n = (id: string, createdAt: string): NotificationResponse => ({
  id, type: 'SYSTEM', title: id, message: '', read: true, link: null, createdAt,
});

describe('groupKeyFor', () => {
  it('buckets by local calendar day, not by elapsed hours', () => {
    expect(groupKeyFor(local(2026, 9, 23, 0, 1), now)).toBe('today');
    expect(groupKeyFor(local(2026, 9, 22, 23, 59), now)).toBe('yesterday');
    expect(groupKeyFor(local(2026, 9, 17), now)).toBe('thisWeek'); // 6 days ago
    expect(groupKeyFor(local(2026, 9, 16), now)).toBe('earlier'); // 7 days ago
  });

  it('treats a future timestamp (clock skew) as today', () => {
    expect(groupKeyFor(local(2026, 9, 24, 3), now)).toBe('today');
  });
});

describe('groupNotifications', () => {
  it('keeps the fixed group order and drops empty groups', () => {
    const groups = groupNotifications(
      [n('old', local(2026, 9, 1)), n('t', local(2026, 9, 23, 0, 5)), n('y', local(2026, 9, 22, 8))],
      now,
    );
    expect(groups.map((g) => g.key)).toEqual(['today', 'yesterday', 'earlier']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['t']);
  });
});
