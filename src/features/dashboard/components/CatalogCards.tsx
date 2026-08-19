'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CalendarDays, Megaphone, Ticket } from 'lucide-react';
import { useCatalogSummaryQuery } from '@/features/platform-admin/queries/get-catalog';
import { config } from '@/config';
import styles from './SuperAdminDashboard.module.scss';

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k`;
  return `${(n / 1_000_000).toFixed(2).replace('.', ',')}M`;
}

// Global catalog cards (ideas 9/10/11) — read-only summaries. CTAs link to
// the existing management surfaces as launch points.
export function CatalogCards() {
  const t = useTranslations('dashboard');
  const { data } = useCatalogSummaryQuery();

  const cards = [
    {
      icon: CalendarDays, title: t('catEvents'), tag: t('catEventsTag'), href: '/dashboard/events', external: false, cta: t('catEventsCta'),
      stats: [
        { label: t('lblPublished'), value: compact(data?.events.published ?? 0), color: '#c7c7cd' },
        { label: t('lblLive'), value: compact(data?.events.live ?? 0), color: '#EF4444' },
        { label: t('lblTotal'), value: compact(data?.events.total ?? 0), color: '#c7c7cd' },
      ],
    },
    {
      icon: Megaphone, title: t('catAds'), tag: 'ADVERTISEMENTS', href: config.adsManagerUrl, external: true, cta: t('catAdsCta'),
      stats: [
        { label: t('lblActive'), value: compact(data?.ads.active ?? 0), color: '#c7c7cd' },
        { label: t('lblImpressions30d'), value: compact(data?.ads.impressions30d ?? 0), color: '#c7c7cd' },
        { label: t('lblReview'), value: compact(data?.ads.review ?? 0), color: '#ffd166' },
      ],
    },
    {
      icon: Ticket, title: t('catCoupons'), tag: t('catCouponsTag'), href: '/dashboard/coupons', external: false, cta: t('catCouponsCta'),
      stats: [
        { label: t('lblActive'), value: compact(data?.coupons.active ?? 0), color: '#c7c7cd' },
        { label: t('lblRedemptions30d'), value: compact(data?.coupons.redemptions30d ?? 0), color: '#7fe0a0' },
        { label: t('lblExpiring7d'), value: compact(data?.coupons.expiring7d ?? 0), color: '#ffd166' },
      ],
    },
  ];

  return (
    <div className={styles.catalogGrid}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.title} className={styles.catalogCard}>
            <div className={styles.catalogHead}>
              <div className={styles.catalogIcon}><Icon size={19} /></div>
              <div>
                <div className={styles.catalogTitle}>{c.title}</div>
                <div className={styles.catalogTag}>{c.tag}</div>
              </div>
            </div>
            <div className={styles.catalogStats}>
              {c.stats.map((s) => (
                <div key={s.label} className={styles.catalogStat}>
                  <span className={styles.catalogStatLabel}>{s.label}</span>
                  <span className={styles.catalogStatValue} style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
            {c.external ? (
              <a href={c.href} target="_blank" rel="noopener noreferrer" className={styles.catalogCta}>{c.cta} →</a>
            ) : (
              <Link href={c.href} className={styles.catalogCta}>{c.cta} →</Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
