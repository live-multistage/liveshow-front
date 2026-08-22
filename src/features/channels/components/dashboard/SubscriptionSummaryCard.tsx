'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@live-show/design-system';
import { formatPrice } from '@/features/events/utils/event-formatters';
import { useChannelSubscriptionSummaryQuery } from '../../queries/channel.queries';
import styles from './SubscriptionSummaryCard.module.scss';

interface Props {
  channelId: string;
  currency: string | null;
}

export function SubscriptionSummaryCard({ channelId, currency }: Props) {
  const t = useTranslations('channels.dashboard.pricing');
  const { data: summary, isLoading } = useChannelSubscriptionSummaryQuery(channelId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('summaryTitle')}</CardTitle>
      </CardHeader>
      <CardContent className={styles.grid}>
        {isLoading || !summary ? (
          <p>...</p>
        ) : (
          <>
            <div className={styles.stat}>
              <span className={styles.value}>{summary.active}</span>
              <span className={styles.label}>{t('summaryActive')}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.value}>{summary.pastDue}</span>
              <span className={styles.label}>{t('summaryPastDue')}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.value}>{summary.canceledThisMonth}</span>
              <span className={styles.label}>{t('summaryCanceledThisMonth')}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.value}>
                {formatPrice(summary.mrrCents / 100, currency ?? 'BRL')}
              </span>
              <span className={styles.label}>{t('summaryMrr')}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
