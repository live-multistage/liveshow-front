'use client';

import Link from 'next/link';
import { Bell, Calendar, CreditCard, Ticket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NotificationResponse, NotificationType } from '../types/notification.types';
import { formatRelativeTime } from '../utils/notification-formatters';
import styles from './NotificationsDropdown.module.scss';

const ICON_BY_TYPE: Record<NotificationType, LucideIcon> = {
  EVENT: Calendar,
  TICKET: Ticket,
  PAYMENT: CreditCard,
  SYSTEM: Bell,
};

interface NotificationItemProps {
  notification: NotificationResponse;
  onSelect: (notification: NotificationResponse) => void;
}

export function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  const Icon = ICON_BY_TYPE[notification.type] ?? Bell;
  const className = `${styles.item} ${notification.read ? '' : styles.itemUnread}`;

  const body = (
    <>
      <span className={styles.itemIcon}>
        <Icon size={16} />
      </span>
      <span className={styles.itemBody}>
        <p className={styles.itemTitle}>{notification.title}</p>
        <p className={styles.itemMessage}>{notification.message}</p>
        <p className={styles.itemTime}>{formatRelativeTime(notification.createdAt)}</p>
      </span>
      {!notification.read && <span className={styles.itemDot} aria-label="Não lida" />}
    </>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} className={className} onClick={() => onSelect(notification)}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={() => onSelect(notification)}>
      {body}
    </button>
  );
}
