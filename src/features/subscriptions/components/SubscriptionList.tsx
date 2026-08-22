'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge, Button } from '@live-show/design-system';
import { formatDateShort, formatPrice } from '@/features/events/utils/event-formatters';
import { useMySubscriptionsQuery } from '../queries/subscription.queries';
import {
  useCancelSubscriptionMutation,
  usePortalMutation,
  useResumeSubscriptionMutation,
} from '../mutations/subscription.mutations';
import type { MySubscription, SubscriptionStatus } from '../types/subscription.types';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import styles from './SubscriptionList.module.scss';

const STATUS_VARIANT: Record<SubscriptionStatus, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  ACTIVE: 'default',
  PAST_DUE: 'destructive',
  CANCELED: 'outline',
  INCOMPLETE: 'secondary',
};

export function SubscriptionList() {
  const t = useTranslations('account.subscriptions');
  const { data: subscriptions, isLoading } = useMySubscriptionsQuery();
  const cancel = useCancelSubscriptionMutation();
  const resume = useResumeSubscriptionMutation();
  const portal = usePortalMutation();
  const [cancelTarget, setCancelTarget] = useState<MySubscription | null>(null);

  if (isLoading) return <p className={styles.state}>{t('loading')}</p>;
  if (!subscriptions || subscriptions.length === 0)
    return <p className={styles.state}>{t('empty')}</p>;

  return (
    <div className={styles.list}>
      {subscriptions.map((subscription) => (
        <div key={subscription.id} className={styles.item}>
          {subscription.channel?.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={subscription.channel.coverUrl} alt="" className={styles.cover} />
          )}

          <div className={styles.info}>
            <h3 className={styles.name}>{subscription.channel?.name ?? t('unknownChannel')}</h3>
            <div className={styles.meta}>
              <Badge variant={STATUS_VARIANT[subscription.status]}>
                {t(`status.${subscription.status}`)}
              </Badge>
              <span>{t(`interval.${subscription.interval}`)}</span>
              <span>
                {formatPrice(subscription.priceCents / 100, subscription.currency)}
              </span>
              <span>
                {t('periodEnd', { date: formatDateShort(subscription.currentPeriodEnd) })}
              </span>
            </div>
            {subscription.cancelAtPeriodEnd && (
              <p className={styles.cancelNotice}>{t('cancelScheduledNotice')}</p>
            )}
          </div>

          <div className={styles.actions}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => portal.mutate(subscription.id)}
              disabled={portal.isPending}
            >
              {t('managePayment')}
            </Button>
            {subscription.cancelAtPeriodEnd ? (
              <Button
                size="sm"
                onClick={() => resume.mutate(subscription.id)}
                disabled={resume.isPending}
              >
                {t('resume')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelTarget(subscription)}
                disabled={subscription.status === 'CANCELED'}
              >
                {t('cancel')}
              </Button>
            )}
          </div>
        </div>
      ))}

      <CancelSubscriptionModal
        open={cancelTarget !== null}
        channelName={cancelTarget?.channel?.name ?? ''}
        isPending={cancel.isPending}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        onConfirm={() => {
          if (!cancelTarget) return;
          cancel.mutate(cancelTarget.id, { onSuccess: () => setCancelTarget(null) });
        }}
      />
    </div>
  );
}
