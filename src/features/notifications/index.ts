export { NotificationsDropdown } from './components/NotificationsDropdown';
export { NotificationItem } from './components/NotificationItem';

export {
  useNotificationsQuery,
  useUnreadCountQuery,
  notificationKeys,
} from './queries/get-notifications';
export {
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from './mutations/mark-as-read.mutation';
export { notificationsService } from './services/notifications.service';
export { formatRelativeTime } from './utils/notification-formatters';

export type {
  NotificationResponse,
  NotificationType,
  UnreadCountResponse,
} from './types/notification.types';
