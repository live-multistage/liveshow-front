'use client';

import { useNotificationsStream } from '../hooks/use-notifications-stream';

export function NotificationsStreamListener() {
  useNotificationsStream();
  return null;
}
