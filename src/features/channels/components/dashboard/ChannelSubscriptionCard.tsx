'use client';

import { useTranslations } from 'next-intl';
import { formatPrice } from '@/features/events/utils/event-formatters';
import { useChannelSubscriptionSummaryQuery } from '../../queries/channel.queries';
import { useSyncChannelPricingMutation } from '../../mutations/channel.mutations';
import type { OrgChannel } from '../../types/channel.types';
import styles from './ChannelDetail.module.scss';

interface Props {
  channelId: string;
  slug: string;
  organizationId: string;
  orgChannel: OrgChannel | undefined;
}

// Números grandes arredondam ("R$ 24,3 mil") — o card do rail não tem largura
// para o MRR completo, e o valor exato vive no Stripe.
function formatMrr(cents: number, currency: string): string {
  const value = cents / 100;
  if (value < 10_000) return formatPrice(value, currency);
  return `${formatPrice(Math.round(value / 100) / 10, currency)}k`;
}

export function ChannelSubscriptionCard({ channelId, slug, organizationId, orgChannel }: Props) {
  const t = useTranslations('channels.detail.subscription');
  const { data: summary } = useChannelSubscriptionSummaryQuery(channelId);
  const syncPricing = useSyncChannelPricingMutation();

  const currency = orgChannel?.currency ?? 'BRL';
  const synced = Boolean(orgChannel?.pricingSynced);

  const price = (cents: number | null | undefined) =>
    cents == null ? t('noPrice') : formatPrice(cents / 100, currency);

  return (
    <section className={`${styles.railCard} ${styles.railCardGlow}`}>
      <div className={styles.railHeader}>
        <span className={styles.eyebrow}>{t('eyebrow')}</span>
        {orgChannel !== undefined && (
          <span className={`${styles.pill} ${synced ? styles.pillSynced : styles.pillPending}`}>
            {t(synced ? 'synced' : 'pending')}
          </span>
        )}
      </div>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{summary?.active ?? '—'}</span>
          <span className={styles.statLabel}>{t('subscribers')}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {summary ? formatMrr(summary.mrrCents, currency) : '—'}
          </span>
          <span className={styles.statLabel}>{t('mrr')}</span>
        </div>
      </div>

      <div className={styles.railRows}>
        <div className={styles.railRow}>
          <span>{t('monthly')}</span>
          <span className={styles.railRowValue}>{price(orgChannel?.monthlyPriceCents)}</span>
        </div>
        <div className={styles.railRow}>
          <span>{t('yearly')}</span>
          <span className={styles.railRowValue}>{price(orgChannel?.yearlyPriceCents)}</span>
        </div>
      </div>

      {orgChannel !== undefined && !synced && (
        <button
          type="button"
          className={styles.railAction}
          disabled={syncPricing.isPending}
          onClick={() =>
            syncPricing.mutate({ id: channelId, slug, organizationId })
          }
        >
          {t(syncPricing.isPending ? 'syncing' : 'sync')}
        </button>
      )}
    </section>
  );
}
