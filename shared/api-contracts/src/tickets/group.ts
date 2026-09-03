import type { AccessCapability } from '../common/access-capability';
import type { AccessibleEvent } from './types';

export interface AccessibleEventGroups {
  live: AccessibleEvent[];
  upcoming: AccessibleEvent[];
  past: AccessibleEvent[];
}

const byStartAsc = (a: AccessibleEvent, b: AccessibleEvent) =>
  Date.parse(a.startsAt) - Date.parse(b.startsAt);

/**
 * `status === 'LIVE'` wins over the clock: the backend flips the status when
 * the stream actually starts, which is routinely before startsAt and after
 * endsAt. Trusting the timestamps alone would drop a running show into "past".
 */
export function groupAccessibleEvents(
  events: AccessibleEvent[],
  now: Date,
): AccessibleEventGroups {
  const nowMs = now.getTime();
  const groups: AccessibleEventGroups = { live: [], upcoming: [], past: [] };

  for (const event of events) {
    if (event.status === 'LIVE') groups.live.push(event);
    else if (Date.parse(event.endsAt) < nowMs) groups.past.push(event);
    else groups.upcoming.push(event);
  }

  groups.live.sort(byStartAsc);
  groups.upcoming.sort(byStartAsc);
  groups.past.sort((a, b) => -byStartAsc(a, b));
  return groups;
}

export function hasPhysicalEntry(capabilities: AccessCapability[]): boolean {
  return capabilities.includes('PHYSICAL_ENTRY');
}
