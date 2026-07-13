export type NotificationPreferenceKey =
  | 'LIVE_EVENTS'
  | 'TICKET_REMINDERS'
  | 'NEWS_PROMOS'
  | 'EMAIL_DIGEST';

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;
