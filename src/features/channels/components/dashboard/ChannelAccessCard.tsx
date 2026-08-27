'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@live-show/design-system';
import { formatPrice } from '@/features/events/utils/event-formatters';
import { useChannelSubscriptionSummaryQuery } from '../../queries/channel.queries';
import { useSyncChannelPricingMutation } from '../../mutations/channel.mutations';
import type { Channel, OrgChannel } from '../../types/channel.types';
import { ChannelPricingForm } from './ChannelPricingForm';
import styles from './ChannelDetail.module.scss';

interface Props {
  channel: Channel;
  orgChannel: OrgChannel | undefined;
}

// Números grandes arredondam ("R$ 24,3 mil") — o card do rail não tem largura
// para o MRR completo, e o valor exato vive no Stripe.
function formatMrr(cents: number, currency: string): string {
  const value = cents / 100;
  if (value < 10_000) return formatPrice(value, currency);
  return `${formatPrice(Math.round(value / 100) / 10, currency)}k`;
}

/**
 * Entrada de primeira classe para acesso/preço de um canal — antes só vivia
 * dentro do diálogo genérico de edição. Sempre visível no rail, para FREE ou
 * SUBSCRIPTION; absorve o corpo do antigo `ChannelSubscriptionCard`.
 */
export function ChannelAccessCard({ channel, orgChannel }: Props) {
  const t = useTranslations('channels.detail');
  const tAccess = useTranslations('channels.detail.access');
  const tSubscription = useTranslations('channels.detail.subscription');
  const isSubscription = channel.accessMode === 'SUBSCRIPTION';

  const { data: summary } = useChannelSubscriptionSummaryQuery(channel.id, {
    enabled: isSubscription,
  });
  const syncPricing = useSyncChannelPricingMutation();
  const [configuring, setConfiguring] = useState(false);

  const currency = orgChannel?.currency ?? 'BRL';
  const synced = Boolean(orgChannel?.pricingSynced);

  const price = (cents: number | null | undefined) =>
    cents == null ? tSubscription('noPrice') : formatPrice(cents / 100, currency);

  return (
    <section className={`${styles.railCard} ${styles.railCardGlow}`}>
      <div className={styles.railHeader}>
        <span className={styles.eyebrow}>{tAccess('eyebrow')}</span>
        <span className={`${styles.pill} ${isSubscription ? styles.pillViolet : styles.pillNeutral}`}>
          {t(isSubscription ? 'accessSubscription' : 'accessFree')}
        </span>
      </div>

      {isSubscription ? (
        <>
          {orgChannel !== undefined && (
            <span
              className={`${styles.pill} ${synced ? styles.pillSynced : styles.pillPending}`}
            >
              {tSubscription(synced ? 'synced' : 'pending')}
            </span>
          )}

          <div className={styles.statRow}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{summary?.active ?? '—'}</span>
              <span className={styles.statLabel}>{tSubscription('subscribers')}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>
                {summary ? formatMrr(summary.mrrCents, currency) : '—'}
              </span>
              <span className={styles.statLabel}>{tSubscription('mrr')}</span>
            </div>
          </div>

          <div className={styles.railRows}>
            <div className={styles.railRow}>
              <span>{tSubscription('monthly')}</span>
              <span className={styles.railRowValue}>{price(orgChannel?.monthlyPriceCents)}</span>
            </div>
            <div className={styles.railRow}>
              <span>{tSubscription('yearly')}</span>
              <span className={styles.railRowValue}>{price(orgChannel?.yearlyPriceCents)}</span>
            </div>
          </div>

          {orgChannel !== undefined && !synced && (
            <button
              type="button"
              className={styles.railAction}
              disabled={syncPricing.isPending}
              onClick={() =>
                syncPricing.mutate({
                  id: channel.id,
                  slug: channel.slug,
                  organizationId: channel.organizationId,
                })
              }
            >
              {tSubscription(syncPricing.isPending ? 'syncing' : 'sync')}
            </button>
          )}
        </>
      ) : (
        <p className={styles.help}>{tAccess('freeDescription')}</p>
      )}

      <button type="button" className={styles.railAction} onClick={() => setConfiguring(true)}>
        {tAccess('configure')}
      </button>

      <Dialog open={configuring} onOpenChange={setConfiguring}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tAccess('dialogTitle')}</DialogTitle>
          </DialogHeader>
          <ChannelPricingForm
            initial={orgChannel ?? channel}
            onDone={() => setConfiguring(false)}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
