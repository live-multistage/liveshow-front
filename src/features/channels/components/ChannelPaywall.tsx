'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Camera, Check, Clock, Lock, Monitor, RotateCcw, ShieldCheck, Zap } from 'lucide-react';
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
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const subscribe = useSubscribeChannelMutation();

  const pricing = channel.pricing;
  const currency = pricing?.currency ?? 'BRL';
  const hasMonthly = pricing?.monthlyPriceCents != null;
  const hasYearly = pricing?.yearlyPriceCents != null;
  const discount =
    hasMonthly && hasYearly
      ? yearlyDiscountPercent(pricing!.monthlyPriceCents!, pricing!.yearlyPriceCents!)
      : null;

  // Default to the yearly plan (the better deal), falling back to monthly when
  // a channel only prices one interval.
  const [selected, setSelected] = useState<SubscriptionInterval>(
    hasYearly ? 'YEARLY' : 'MONTHLY',
  );

  function handleSubscribe() {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    subscribe.mutate({ channelId: channel.id, interval: selected });
  }

  const selectedLabel = selected === 'YEARLY' ? t('planNameYearly') : t('planNameMonthly');
  const cover = channel.coverUrl;

  const perks = [
    { icon: Clock, label: t('perkSchedule') },
    { icon: Camera, label: t('perkCameras') },
    { icon: RotateCcw, label: t('perkReplay') },
    { icon: Monitor, label: t('perkQuality') },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.ambient} aria-hidden="true" />

      <div className={styles.breadcrumb}>
        <Link href="/channels" className={styles.backLink}>
          <ArrowLeft size={14} strokeWidth={2.2} />
          {t('backToChannels')}
        </Link>
      </div>

      <div className={styles.grid}>
        {/* LEFT: locked channel preview */}
        <section className={styles.preview}>
          <div className={styles.poster}>
            <div className={styles.posterArt}>
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className={styles.posterImage} />
              ) : (
                <span className={styles.posterFallback} aria-hidden="true" />
              )}
              <span className={styles.posterScrim} aria-hidden="true" />
            </div>

            {channel.isOnAir ? (
              <span className={styles.onAir}>
                <span className={styles.onAirDot} />
                {t('onAir')}
              </span>
            ) : (
              <span className={styles.offAir}>{t('offAir')}</span>
            )}
            <span className={styles.badge24h}>{t('badge24h')}</span>

            <div className={styles.lockBlock}>
              <span className={styles.lockCircle}>
                <Lock size={32} strokeWidth={1.7} />
              </span>
              <div className={styles.lockText}>
                <div className={styles.lockEyebrow}>{channel.name}</div>
                {channel.current && (
                  <div className={styles.lockNow}>
                    {channel.current.name}
                    <span className={styles.lockNowMuted}> · {t('liveNow')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.bug}>
              <span className={styles.bugWave} aria-hidden="true">
                <span className={styles.bugBar} />
                <span className={styles.bugBar} />
                <span className={styles.bugBar} />
              </span>
              <span className={styles.bugLabel}>{channel.name}</span>
            </div>
          </div>

          <div className={styles.unlocks}>
            <span className={styles.unlocksTitle}>{t('unlocksTitle')}</span>
            {perks.map((perk) => (
              <div key={perk.label} className={styles.perk}>
                <span className={styles.perkIcon}>
                  <perk.icon size={14} strokeWidth={2.2} />
                </span>
                <span className={styles.perkLabel}>{perk.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT: subscription offer */}
        <section className={styles.offer}>
          <div className={styles.badge}>
            <Lock size={12} aria-hidden="true" />
            {t('restricted')}
          </div>

          <div>
            <h1 className={styles.headline}>{t('headline', { name: channel.name })}</h1>
            <p className={styles.subtitle}>{t('subtitle')}</p>
          </div>

          {pricing === null || (!hasMonthly && !hasYearly) ? (
            <p className={styles.unavailable}>{t('unavailable')}</p>
          ) : (
            <>
              <div className={styles.plans}>
                {hasMonthly && (
                  <PlanCard
                    selected={selected === 'MONTHLY'}
                    label={t('monthly')}
                    price={formatPrice(pricing!.monthlyPriceCents! / 100, currency, locale)}
                    period={t('perMonth')}
                    note={t('monthlyNote')}
                    onSelect={() => setSelected('MONTHLY')}
                  />
                )}
                {hasYearly && (
                  <PlanCard
                    selected={selected === 'YEARLY'}
                    label={t('yearly')}
                    price={formatPrice(pricing!.yearlyPriceCents! / 100, currency, locale)}
                    period={t('perYear')}
                    note={t('yearlyEquivalent', {
                      price: formatPrice(pricing!.yearlyPriceCents! / 12 / 100, currency, locale),
                    })}
                    discount={
                      discount !== null && discount > 0
                        ? {
                            label: t('savePercent', { percent: discount }),
                            aria: t('savePercentAria', { percent: discount }),
                          }
                        : undefined
                    }
                    onSelect={() => setSelected('YEARLY')}
                  />
                )}
              </div>

              <button
                type="button"
                className={styles.cta}
                disabled={subscribe.isPending}
                onClick={handleSubscribe}
              >
                {t('cta', { plan: selectedLabel })}
                <ArrowRight size={16} strokeWidth={2.6} />
              </button>

              <div className={styles.reassure}>
                <span className={styles.reassureItem}>
                  <Check size={13} strokeWidth={2.4} className={styles.reassureCancel} />
                  {t('reassureCancel')}
                </span>
                <span className={styles.reassureItem}>
                  <Zap size={13} strokeWidth={2.2} className={styles.reassureInstant} />
                  {t('reassureInstant')}
                </span>
                <span className={styles.reassureItem}>
                  <ShieldCheck size={13} strokeWidth={2.2} className={styles.reassureSecure} />
                  {t('reassureSecure')}
                </span>
              </div>

              {!isLoggedIn && (
                <div className={styles.loginRow}>
                  {t('alreadyMember')}{' '}
                  <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className={styles.loginLink}>
                    {t('login')} →
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

interface PlanCardProps {
  selected: boolean;
  label: string;
  price: string;
  period: string;
  note: string;
  discount?: { label: string; aria: string };
  onSelect: () => void;
}

function PlanCard({ selected, label, price, period, note, discount, onSelect }: PlanCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      className={clsx(styles.plan, selected && styles.planSelected)}
      onClick={onSelect}
    >
      {discount && (
        <span className={styles.discountBadge} aria-label={discount.aria}>
          {discount.label}
        </span>
      )}
      <div className={styles.planHead}>
        <span className={styles.planLabel}>{label}</span>
        <span className={clsx(styles.radio, selected && styles.radioOn)}>
          {selected && <span className={styles.radioDot} />}
        </span>
      </div>
      <div className={styles.planPrice}>
        {price}
        <span className={styles.planPeriod}>{period}</span>
      </div>
      <span className={styles.planNote}>{note}</span>
    </button>
  );
}
