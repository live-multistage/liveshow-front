import type { EventResponse } from '@/features/events/types/event.types';

/** The one player URL per event; `/live/:id` and `/replay/:id` redirect here. */
export function watchPath(eventId: string): string {
  return `/watch/${eventId}`;
}

export type WatchMode = 'live' | 'replay';

/**
 * Which gate `/watch/:id` mounts. Only a finished live event (or a VOD, which
 * never goes live) is a replay; everything before or during the show is the
 * live gate, whose waiting room covers "not started yet". Whether a replay is
 * actually available, or the viewer may see it, stays ReplayGate's call.
 */
export function watchMode(event: Pick<EventResponse, 'status' | 'format'>): WatchMode {
  if (event.format === 'VOD') return 'replay';
  return event.status === 'FINISHED' ? 'replay' : 'live';
}

/** `?t=90` or `?t=90s` → 90. Anything else is ignored rather than guessed at. */
export function parseStartSeconds(raw: string | null | undefined): number | null {
  const match = raw?.match(/^(\d+)s?$/);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isSafeInteger(seconds) ? seconds : null;
}
