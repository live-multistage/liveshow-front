'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TrackingShell } from '../TrackingShell';
import { ExploreTab } from './ExploreTab';
import { FunnelTab } from './FunnelTab';
import { RetentionTab } from './RetentionTab';
import { FeaturesTab } from './FeaturesTab';
import { PathsTab } from './PathsTab';
import styles from './ReportsShared.module.scss';

export type ReportTabKey = 'explore' | 'funnels' | 'retention' | 'features' | 'paths';

const TABS: { key: ReportTabKey; href: string }[] = [
  { key: 'explore', href: '/dashboard/platform/tracking/explore' },
  { key: 'funnels', href: '/dashboard/platform/tracking/funnels' },
  { key: 'retention', href: '/dashboard/platform/tracking/retention' },
  { key: 'features', href: '/dashboard/platform/tracking/features' },
  { key: 'paths', href: '/dashboard/platform/tracking/paths' },
];

interface Props {
  tab: ReportTabKey;
  trackingEnabled: boolean;
}

// One tabbed component for the 4 report screens (design: relatorios-and-usuario-spec.md,
// section "Relatórios"). Each tab is its own route; switching tabs is a plain navigation
// (no shared query state across tabs — each has its own form fields).
export function TrackingReportsPage({ tab, trackingEnabled }: Props) {
  const t = useTranslations('platformAdmin.tracking');

  return (
    <TrackingShell
      active="reports"
      title={t(`reports.${tab}.title`)}
      subtitle={t('reports.eyebrow')}
      trackingEnabled={trackingEnabled}
    >
      <nav className={styles.tabsRow} aria-label={t('reports.eyebrow')}>
        {TABS.map(({ key, href }) => (
          <Link key={key} href={href} className={`${styles.tab} ${key === tab ? styles.active : ''}`}>
            {t(`reports.tabs.${key}`)}
          </Link>
        ))}
      </nav>

      {tab === 'explore' && <ExploreTab />}
      {tab === 'funnels' && <FunnelTab />}
      {tab === 'retention' && <RetentionTab />}
      {tab === 'features' && <FeaturesTab />}
      {tab === 'paths' && <PathsTab />}
    </TrackingShell>
  );
}
