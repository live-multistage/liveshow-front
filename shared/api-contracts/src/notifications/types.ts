export type NotificationType =
  | 'EVENT'
  | 'TICKET'
  | 'PAYMENT'
  | 'SYSTEM'
  // Present in the backend enum since it shipped; added here in M4b because
  // the preference map has to cover every value the API can send.
  | 'RECOMMENDATION'
  | 'ADVERTISEMENT'
  | 'COLLABORATION';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  /** Optional in-app deep link (e.g. `/events/123`). */
  link?: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export type NotificationPreferenceKey =
  | 'LIVE_EVENTS'
  | 'TICKET_REMINDERS'
  | 'NEWS_PROMOS'
  | 'EMAIL_DIGEST';

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export type DevicePlatform = 'ios' | 'android';

/** The three push-copy catalogs the backend ships. */
export type DeviceLocale = 'pt' | 'en' | 'es';

/** Body of `PUT /me/devices` → 204. Idempotent; the app re-sends every 7 days. */
export interface RegisterDeviceRequest {
  /** `ExponentPushToken[...]` or `ExpoPushToken[...]`; anything else is a 400. */
  token: string;
  platform: DevicePlatform;
  appVersion?: string;
  locale: DeviceLocale;
}

/** Not exposed by any endpoint today — kept for a future "my devices" screen. */
export interface DeviceTokenView {
  id: string;
  platform: DevicePlatform;
  lastSeenAt: string;
}

/** `data` of an Expo push. `link` goes through safeNotificationHref before use. */
export interface PushPayloadData {
  link?: string | null;
  notificationId: string;
}
