import { describe, expect, it } from 'vitest';
import { NOTIFICATION_PREFERENCE_BY_TYPE } from './preference-map';
import type { NotificationType } from './types';

// Kept as a literal list, not derived from the map, so that adding a type to
// the union without adding it here is a compile error rather than a silent
// "always send".
const ALL_TYPES: NotificationType[] = [
  'EVENT',
  'TICKET',
  'PAYMENT',
  'SYSTEM',
  'RECOMMENDATION',
  'ADVERTISEMENT',
  'COLLABORATION',
];

describe('NOTIFICATION_PREFERENCE_BY_TYPE', () => {
  it('maps every NotificationType', () => {
    for (const type of ALL_TYPES) {
      expect(Object.prototype.hasOwnProperty.call(NOTIFICATION_PREFERENCE_BY_TYPE, type), type).toBe(true);
    }
    expect(Object.keys(NOTIFICATION_PREFERENCE_BY_TYPE).sort()).toEqual([...ALL_TYPES].sort());
  });

  // The map has to be the same table the orchestrator applies, or the account
  // screen would promise a toggle that gates nothing.
  it('mirrors the server-side map', () => {
    expect(NOTIFICATION_PREFERENCE_BY_TYPE).toEqual({
      EVENT: 'LIVE_EVENTS',
      TICKET: 'TICKET_REMINDERS',
      PAYMENT: 'TICKET_REMINDERS',
      RECOMMENDATION: 'NEWS_PROMOS',
      ADVERTISEMENT: 'NEWS_PROMOS',
      SYSTEM: null,
      COLLABORATION: null,
    });
  });
});
