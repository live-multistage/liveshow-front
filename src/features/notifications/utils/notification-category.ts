import type { NotificationType } from '../types/notification.types';

export type NotificationCategoryKey =
  | 'show'
  | 'ticket'
  | 'payment'
  | 'system'
  | 'recommendation'
  | 'collaboration'
  | 'ad';

// One category label per type (the row's footer chip) — finer-grained than
// the 3 filter groups (SHOWS/INGRESSOS/CONTA), which the backend applies.
export const CATEGORY_KEY_BY_TYPE: Record<NotificationType, NotificationCategoryKey> = {
  EVENT: 'show',
  RECOMMENDATION: 'recommendation',
  COLLABORATION: 'collaboration',
  TICKET: 'ticket',
  PAYMENT: 'payment',
  SYSTEM: 'system',
  ADVERTISEMENT: 'ad',
};
