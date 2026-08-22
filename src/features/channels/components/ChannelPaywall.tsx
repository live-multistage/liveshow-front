'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { Button } from '@live-show/design-system';
import { formatPrice } from '@/features/events/utils/event-formatters';
import { useSubscribeChannelMutation } from '../mutations/channel.mutations';
import type { PublicChannel, SubscriptionInterval } from '../types/channel.types';
import styles from './ChannelPaywall.module.scss';

interface Props {
  channel: PublicChannel;
  isLoggedIn: boolean;
}

// round((1 - yearly / (monthly * 12)) * 100), only meaningful when both
// prices exist — a single-plan channel has nothing to compare against.
function yearlyDiscountPercent(monthlyCents: number, yearlyCents: number): number {
  return Math.round((1 - yearlyCents / (monthlyCents * 12)) * 100);
}

export function ChannelPaywall({ channel, isLoggedIn }: Props) {
  const t = useTranslations('channels.subscription');
  const router = useRouter();
  const pathname = usePathname();
  const subscribe = useSubscribeChannelMutation();

  const pricing = channel.pricing;
  const currency = pricing?.currency ?? 'BRL';
  const discount =
    pricing?.monthlyPriceCents != null && pricing?.yearlyPriceCents != null
      ? yearlyDiscountPercent(pricing.monthlyPriceCents, pricing.yearlyPriceCents)
      : null;

  function handleSubscribe(interval: SubscriptionInterval) {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    subscribe.mutate({ channelId: channel.id, interval });
  }

  return (
    <div className={styles.root}>
      <div className={styles.badge}>
        <Lock size={12} aria-hidden="true" />
        {t('restricted')}
      </div>

      <h1 className={styles.headline}>{t('headline', { name: channel.name })}</h1>
      <p className={styles.subtitle}>{t('subtitle')}</p>

      <div className={styles.plans}>
        {pricing?.monthlyPriceCents != null && (
          <div className={styles.plan}>
            <div className={styles.planLabel}>{t('monthly')}</div>
            <div className={styles.planPrice}>
              {formatPrice(pricing.monthlyPriceCents / 100, currency)}
              <span className={styles.planPeriod}>{t('perMonth')}</span>
            </div>
            <Button
              onClick={() => handleSubscribe('MONTHLY')}
              disabled={subscribe.isPending}
            >
              {t('subscribe')}
            </Button>
          </div>
        )}

        {pricing?.yearlyPriceCents != null && (
          <div className={styles.plan}>
            {discount !== null && discount > 0 && (
              <div className={styles.discountBadge}>{t('savePercent', { percent: discount })}</div>
            )}
            <div className={styles.planLabel}>{t('yearly')}</div>
            <div className={styles.planPrice}>
              {formatPrice(pricing.yearlyPriceCents / 100, currency)}
              <span className={styles.planPeriod}>{t('perYear')}</span>
            </div>
            <Button
              onClick={() => handleSubscribe('YEARLY')}
              disabled={subscribe.isPending}
            >
              {t('subscribe')}
            </Button>
          </div>
        )}

        {pricing === null && <p className={styles.unavailable}>{t('unavailable')}</p>}
      </div>
    </div>
  );
}
