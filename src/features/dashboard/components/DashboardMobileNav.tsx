'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Logo } from '@live-show/design-system';
import { useAuth } from '@/features/account';
import { NotificationsDropdown } from '@/features/notifications';
import { NAV_BY_ROLE, MOBILE_NAV_BY_ROLE, DASHBOARD_ROLES } from '../types/dashboard.types';
import { DashboardUserMenu } from './DashboardUserMenu';
import type { UserRole } from '@/types';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from '@/features/feature-flags';
import styles from './DashboardMobileNav.module.scss';

// Mobile-only chrome (hidden on desktop via SCSS) — a sticky top bar plus a
// fixed bottom nav that mirrors the desktop sidebar. The bottom nav shows the
// curated MOBILE_NAV_BY_ROLE subset; the desktop sidebar stays the full nav.
export function DashboardMobileNav({ flags = DEFAULT_FEATURE_FLAGS }: { flags?: FeatureFlags }) {
  const tMobile = useTranslations('dashboard.navMobile');
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user || !DASHBOARD_ROLES.includes(user.role)) return null;

  const role = user.role as Exclude<UserRole, 'USER'>;
  const navByKey = new Map(NAV_BY_ROLE[role].map((item) => [item.navKey, item]));
  const items = MOBILE_NAV_BY_ROLE[role]
    .map((key) => navByKey.get(key))
    .filter((item): item is NonNullable<typeof item> => item != null)
    .filter((item) => !item.flag || flags[item.flag]);

  return (
    <>
      <header className={styles.topBar}>
        <Link href="/" className={styles.logoWrapper} aria-label="showon.io">
          <Logo size={22} wordmarkClassName={styles.logoText} />
        </Link>
        <div className={styles.topActions}>
          <NotificationsDropdown triggerClassName={styles.notifTrigger} />
          <DashboardUserMenu compact />
        </div>
      </header>

      <nav className={styles.bottomNav}>
        <div className={styles.bottomNavInner}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <Icon size={20} className={styles.navIcon} />
                <span className={styles.navLabel}>
                  {tMobile(item.navKey as Parameters<typeof tMobile>[0])}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
