'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { PlatformPageShell } from '@/features/platform-admin/components/PlatformPageShell';
import styles from './TrackingShell.module.scss';

export type TrackingNavKey = 'overview' | 'debugger' | 'plan' | 'sources' | 'destinations' | 'reports' | 'user';

const SUB_NAV: { key: TrackingNavKey; href: string }[] = [
  { key: 'overview', href: '/dashboard/platform/tracking' },
  { key: 'debugger', href: '/dashboard/platform/tracking/debugger' },
  { key: 'plan', href: '/dashboard/platform/tracking/plan' },
  { key: 'sources', href: '/dashboard/platform/tracking/sources' },
  { key: 'destinations', href: '/dashboard/platform/tracking/destinations' },
  { key: 'reports', href: '/dashboard/platform/tracking/explore' },
];

interface Props {
  active: TrackingNavKey;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  trackingEnabled: boolean;
  children: ReactNode;
}

// Shared shell for every /dashboard/platform/tracking/* screen (design:
// Showon Tracking Overview.dc.html — sidebar "Tracking" sub-nav). The
// overview page is the landing screen for the OPERACIONAL nav group, so it
// keeps that eyebrow; every other tracking screen shows "TRACKING" as its
// own breadcrumb (matches the design exactly).
export function TrackingShell({ active, title, subtitle, actions, trackingEnabled, children }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const pathname = usePathname();

  return (
    <PlatformPageShell
      group={active === 'overview' ? t('shell.group') : t('shell.groupSub')}
      title={title}
      subtitle={subtitle}
      actions={actions}
    >
      <nav className={styles.subNav} aria-label={t('shell.nav.overview')}>
        {SUB_NAV.map(({ key, href }) => {
          const isActive = key === active || (key !== 'overview' && pathname.startsWith(href));
          return (
            <Link key={key} href={href} className={`${styles.subNavItem} ${isActive ? styles.active : ''}`}>
              {t(`shell.nav.${key}`)}
            </Link>
          );
        })}
      </nav>

      {!trackingEnabled && (
        <div className={styles.flagOffBanner} role="status">
          <AlertTriangle size={18} />
          <p>
            {t.rich('shell.flagOffBanner', {
              strong: (c) => <strong>{c}</strong>,
              mono: (c) => <span className={styles.mono}>{c}</span>,
            })}
          </p>
        </div>
      )}

      {children}
    </PlatformPageShell>
  );
}
