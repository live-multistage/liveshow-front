'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@live-show/design-system';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account';
import { NotificationsDropdown } from '@/features/notifications';
import { NAV_BY_ROLE, DASHBOARD_ROLES } from '../types/dashboard.types';
import { DashboardUserMenu } from './DashboardUserMenu';
import type { UserRole } from '@/types';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from '@/features/feature-flags';
import styles from './DashboardSidebar.module.scss';
import { ArrowUpRight } from 'lucide-react';

// The page editor needs the width: the admin nav collapses to an icon rail (prototype `.side.mini`).
const COMPACT_ROUTE = /^\/dashboard\/platform\/pages\/[^/]+\/?$/;

export function DashboardSidebar({ flags = DEFAULT_FEATURE_FLAGS }: { flags?: FeatureFlags }) {
  const t = useTranslations('dashboard.nav');
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user || !DASHBOARD_ROLES.includes(user.role)) return null;

  const compact = COMPACT_ROUTE.test(pathname);
  const role = user.role as Exclude<UserRole, 'USER'>;
  const navItems = NAV_BY_ROLE[role].filter((item) => !item.flag || flags[item.flag]);

  return (
    <aside className={styles.sidebar} data-compact={compact || undefined}>
      {/* Logo */}
      <Link href="/" className={styles.logoWrapper}>
        <Logo size={26} wordmarkClassName={styles.logoText} />
        <span className={styles.logoBadge}>{role === 'SUPER_ADMIN' ? 'ADMIN' : 'STUDIO'}</span>
      </Link>

      {/* Nav — renders a section label whenever an item's group changes. */}
      <nav className={styles.nav}>
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isExternal = item.href.startsWith('http');
          // usePathname() never includes a hash, so strip it (e.g. platformFeatureFlags's
          // "/dashboard/platform/settings#feature-flags") before comparing.
          const hrefPath = item.href.split('#')[0];
          const isActive = !isExternal && (pathname === hrefPath || (hrefPath !== '/dashboard' && pathname.startsWith(hrefPath)));
          const showGroup = item.group && item.group !== navItems[i - 1]?.group;
          const label = t(item.navKey as Parameters<typeof t>[0]);
          return (
            <div key={item.href}>
              {showGroup && <div className={styles.navSectionLabel}>{item.group}</div>}
              <Link
                href={item.href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                title={compact ? label : undefined}
              >
                <Icon size={18} className={styles.navIcon} />
                <span className={styles.navLabel}>{label}</span>
                {!compact && item.badge?.()}
                {!compact && item.external && <ArrowUpRight size={14} />}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User block + notifications */}
      <div className={styles.userMenuWrapper}>
        {!compact && (
          <div className={styles.userMenuMain}>
            <DashboardUserMenu />
          </div>
        )}
        <NotificationsDropdown triggerClassName={styles.notifTrigger} />
      </div>
    </aside>
  );
}
