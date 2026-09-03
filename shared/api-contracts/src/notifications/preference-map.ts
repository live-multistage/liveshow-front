import type { NotificationPreferenceKey, NotificationType } from './types';

/**
 * Which account toggle gates each notification type — the same table the
 * orchestrator applies in `CreateNotificationUseCase`. `null` = always
 * delivered (account/security messages and collaboration invites).
 *
 * Shared so a client can explain what a toggle actually silences; the server
 * remains the one that enforces it.
 */
export const NOTIFICATION_PREFERENCE_BY_TYPE: Record<
  NotificationType,
  NotificationPreferenceKey | null
> = {
  EVENT: 'LIVE_EVENTS',
  TICKET: 'TICKET_REMINDERS',
  PAYMENT: 'TICKET_REMINDERS',
  RECOMMENDATION: 'NEWS_PROMOS',
  ADVERTISEMENT: 'NEWS_PROMOS',
  SYSTEM: null,
  COLLABORATION: null,
};
