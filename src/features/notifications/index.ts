export { NotificationsDropdown } from './components/NotificationsDropdown';
export { NotificationItem } from './components/NotificationItem';
export { AccountNotificationsContent } from './components/AccountNotificationsContent';

export {
  useNotificationsQuery,
  useUnreadCountQuery,
  useNotificationsPageQuery,
  notificationKeys,
} from './queries/get-notifications';
export {
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from './mutations/mark-as-read.mutation';
export { useDismissNotificationMutation } from './mutations/dismiss-notification.mutation';
export { notificationsService } from './services/notifications.service';
export { formatRelativeTime } from './utils/notification-formatters';

export type {
  NotificationResponse,
  NotificationType,
  UnreadCountResponse,
  NotificationFilter,
  NotificationCounts,
  NotificationsPageResponse,
} from './types/notification.types';
