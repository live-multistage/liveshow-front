'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { useNotificationsQuery, useUnreadCountQuery } from '../queries/get-notifications';
import { useMarkAllAsReadMutation, useMarkAsReadMutation } from '../mutations/mark-as-read.mutation';
import type { NotificationResponse } from '../types/notification.types';
import { NotificationItem } from './NotificationItem';
import styles from './NotificationsDropdown.module.scss';

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadCountQuery();
  // Defer the list fetch until the panel is actually opened.
  const { data: notifications, isLoading, isError } = useNotificationsQuery(open);

  const markAsRead = useMarkAsReadMutation();
  const markAllAsRead = useMarkAllAsReadMutation();

  const hasNotifications = !!notifications && notifications.length > 0;

  const handleSelect = (notification: NotificationResponse) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={styles.trigger} aria-label="Notificações">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className={styles.content}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Notificações</span>
          <button
            type="button"
            className={styles.markAllBtn}
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
            <p className={styles.state}>Nenhuma notificação por aqui.</p>
          )}
          {hasNotifications &&
            notifications!.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={handleSelect}
              />
            ))}
        </div>

        <div className={styles.footer}>
          <Link href="/notifications" className={styles.footerLink} onClick={() => setOpen(false)}>
            Ver todas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
