import type { NotificationResponse } from '../types/notification.types';

export type NotificationGroupKey = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

const GROUP_ORDER: NotificationGroupKey[] = ['today', 'yesterday', 'thisWeek', 'earlier'];

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Calendar-day diff in the browser's local timezone, per the brief.
export function groupKeyFor(createdAt: string, now: Date): NotificationGroupKey {
  const diffDays = Math.round((startOfDay(now) - startOfDay(new Date(createdAt))) / 86_400_000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays <= 6) return 'thisWeek';
  return 'earlier';
}

export interface NotificationGroup {
  key: NotificationGroupKey;
  items: NotificationResponse[];
}

// Empty groups are dropped — the caller never renders a group header with no rows.
export function groupNotifications(items: NotificationResponse[], now: Date = new Date()): NotificationGroup[] {
  const buckets: Record<NotificationGroupKey, NotificationResponse[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };
  for (const item of items) {
    buckets[groupKeyFor(item.createdAt, now)].push(item);
  }
  return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({ key, items: buckets[key] }));
}
