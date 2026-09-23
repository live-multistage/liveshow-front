'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck, CheckCircle2, Lock, Radio, Tag, Ticket as TicketIcon, UserPlus, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, Skeleton } from '@live-show/design-system';
import { useMarkAllAsReadMutation, useMarkAsReadMutation } from '../mutations/mark-as-read.mutation';
import { useDismissNotificationMutation } from '../mutations/dismiss-notification.mutation';
import { useNotificationsPageQuery, useUnreadCountQuery } from '../queries/get-notifications';
import { formatRelativeTime } from '../utils/notification-formatters';
import { isSafeNotificationLink } from '../utils/safe-link';
import { groupNotifications } from '../utils/notification-groups';
import { CATEGORY_KEY_BY_TYPE } from '../utils/notification-category';
import type { NotificationFilter, NotificationResponse, NotificationType } from '../types/notification.types';
import styles from './AccountNotificationsContent.module.scss';

const FILTER_KEYS: NotificationFilter[] = ['all', 'unread', 'shows', 'tickets', 'account'];

const TYPE_META: Record<NotificationType, { icon: LucideIcon; iconClass: string }> = {
  EVENT: { icon: Radio, iconClass: styles.iconEvent },
  RECOMMENDATION: { icon: Tag, iconClass: styles.iconRecommendation },
  TICKET: { icon: TicketIcon, iconClass: styles.iconTicket },
  COLLABORATION: { icon: UserPlus, iconClass: styles.iconCollaboration },
  PAYMENT: { icon: CheckCircle2, iconClass: styles.iconPayment },
  SYSTEM: { icon: Lock, iconClass: styles.iconSystem },
  // Same visual treatment as RECOMMENDATION per the design brief.
  ADVERTISEMENT: { icon: Tag, iconClass: styles.iconRecommendation },
};

interface RowProps {
  notification: NotificationResponse;
  onOpen: (notification: NotificationResponse) => void;
  onDismiss: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}

function NotificationRow({ notification, onOpen, onDismiss, t }: RowProps) {
  const meta = TYPE_META[notification.type];
  const Icon = meta.icon;
  const safe = isSafeNotificationLink(notification.link);
  const categoryKey = CATEGORY_KEY_BY_TYPE[notification.type];

  const activate = () => onOpen(notification);

  return (
    <div
      className={`${styles.row} ${notification.read ? '' : styles.rowUnread}`}
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
    >
      <span className={`${styles.icon} ${meta.iconClass}`}>
        <Icon size={18} />
      </span>
      <div className={styles.body}>
        <p className={`${styles.titleText} ${notification.read ? styles.itemTitleRead : styles.itemTitleUnread}`}>
          {!notification.read && <span className={styles.dot} aria-hidden="true" />}
          {notification.title}
        </p>
        <p className={styles.message}>{notification.message}</p>
        <div className={styles.footer}>
          <span className={styles.time}>{formatRelativeTime(notification.createdAt)}</span>
          <span className={styles.chip}>{t(`categories.${categoryKey}`)}</span>
          {safe && <span className={styles.open}>{t('open')} →</span>}
        </div>
      </div>
      <button
        type="button"
        className={styles.dismiss}
        title={t('dismiss')}
        aria-label={t('dismiss')}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function AccountNotificationsContent() {
  const t = useTranslations('account.notificationsCenter');
  const router = useRouter();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationsPageQuery(filter);
  const { data: unreadCount = 0 } = useUnreadCountQuery();

  const markAsRead = useMarkAsReadMutation();
  const markAllAsRead = useMarkAllAsReadMutation();
  const dismiss = useDismissNotificationMutation();

  const pages = data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const counts = pages[0]?.counts;
  const groups = groupNotifications(items);

  const handleOpen = (notification: NotificationResponse) => {
    if (!notification.read) markAsRead.mutate(notification.id);
    if (isSafeNotificationLink(notification.link)) router.push(notification.link!);
  };

  const totalEmpty = counts !== undefined && counts.all === 0;
  const filterEmpty = !totalEmpty && items.length === 0;

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div>
          <div className={styles.eyebrow}>{t('eyebrow')}</div>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{t('title')}</h2>
            {unreadCount > 0 && <span className={styles.unreadPill}>{t('unreadPill', { count: unreadCount })}</span>}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.markAllBtn}
          onClick={() => markAllAsRead.mutate()}
          disabled={unreadCount === 0 || markAllAsRead.isPending}
        >
          <CheckCheck size={14} />
          {t('markAll')}
        </Button>
      </div>

      <div className={styles.filters} role="tablist">
        {FILTER_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            className={`${styles.filterPill} ${filter === key ? styles.filterPillActive : ''}`}
            onClick={() => setFilter(key)}
          >
            {t(`filters.${key}`)} <span className={styles.filterCount}>{counts?.[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={styles.skeletonRow} />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className={styles.errorState}>
          <p>{t('loadError')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {!isLoading && !isError && totalEmpty && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <Bell size={24} />
          </span>
          <p className={styles.emptyTitle}>{t('emptyTitle')}</p>
          <p className={styles.emptyDesc}>{t('emptyDesc')}</p>
          <Button type="button" onClick={() => router.push('/events')}>
            {t('explore')} →
          </Button>
        </div>
      )}

      {!isLoading && !isError && !totalEmpty && filterEmpty && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <Bell size={24} />
          </span>
          <p className={styles.emptyTitle}>{t('filterEmptyTitle')}</p>
          <p className={styles.emptyDesc}>{t('filterEmptyDesc')}</p>
        </div>
      )}

      {!isLoading && !isError && !totalEmpty && !filterEmpty && (
        <>
          {groups.map((group) => (
            <div key={group.key}>
              <div className={styles.groupLabel}>{t(`groups.${group.key}`)}</div>
              {group.items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onOpen={handleOpen}
                  onDismiss={(id) => dismiss.mutate(id)}
                  t={t}
                />
              ))}
            </div>
          ))}
          {hasNextPage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={styles.loadMoreBtn}
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {t('loadMore')}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
