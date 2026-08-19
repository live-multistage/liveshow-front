'use client';

import { useNotificationsQuery, useUnreadCountQuery } from '../queries/get-notifications';
import { useMarkAllAsReadMutation, useMarkAsReadMutation } from '../mutations/mark-as-read.mutation';
import type { NotificationResponse } from '../types/notification.types';
import { NotificationItem } from './NotificationItem';
import styles from './NotificationsPageContent.module.scss';

// Full notifications view (the dropdown's "Ver todas" destination).
export function NotificationsPageContent() {
  const { data: notifications, isLoading, isError } = useNotificationsQuery(true);
  const { data: unreadCount = 0 } = useUnreadCountQuery();
  const markAsRead = useMarkAsReadMutation();
  const markAllAsRead = useMarkAllAsReadMutation();

  const hasNotifications = !!notifications && notifications.length > 0;

  const handleSelect = (n: NotificationResponse) => {
    if (!n.read) markAsRead.mutate(n.id);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>CONTA</div>
          <h1 className={styles.title}>Notificações</h1>
        </div>
        <button
          type="button"
          className={styles.markAll}
          onClick={() => markAllAsRead.mutate()}
          disabled={unreadCount === 0 || markAllAsRead.isPending}
        >
          Marcar todas como lidas
        </button>
      </div>

      <div className={styles.list}>
        {isLoading && <p className={styles.state}>Carregando…</p>}
        {isError && <p className={styles.state}>Não foi possível carregar as notificações.</p>}
        {!isLoading && !isError && !hasNotifications && (
          <p className={styles.state}>Você ainda não tem notificações.</p>
        )}
        {hasNotifications &&
          notifications!.map((n) => (
            <NotificationItem key={n.id} notification={n} onSelect={handleSelect} />
          ))}
      </div>
    </div>
  );
}
