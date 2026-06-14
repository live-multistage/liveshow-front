export type NotificationType = 'EVENT' | 'TICKET' | 'PAYMENT' | 'SYSTEM';

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
