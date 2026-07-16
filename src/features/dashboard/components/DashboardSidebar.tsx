'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/shared/components/Logo';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account';
import { NAV_BY_ROLE, DASHBOARD_ROLES } from '../types/dashboard.types';
import { DashboardUserMenu } from './DashboardUserMenu';
import type { UserRole } from '@/types';
import styles from './DashboardSidebar.module.scss';

export function DashboardSidebar() {
  const t = useTranslations('dashboard.nav');
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user || !DASHBOARD_ROLES.includes(user.role)) return null;

  const role = user.role as Exclude<UserRole, 'USER'>;
  const navItems = NAV_BY_ROLE[role];

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <Link href="/" className={styles.logoWrapper}>
        <Logo size={26} wordmarkClassName={styles.logoText} />
        <span className={styles.logoBadge}>{role === 'SUPER_ADMIN' ? 'ADMIN' : 'STUDIO'}</span>
      </Link>

      {/* Nav — renders a section label whenever an item's group changes. */}
      <nav className={styles.nav}>
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const showGroup = item.group && item.group !== navItems[i - 1]?.group;
          return (
            <div key={item.href}>
              {showGroup && <div className={styles.navSectionLabel}>{item.group}</div>}
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <Icon size={18} className={styles.navIcon} />
                {t(item.navKey as Parameters<typeof t>[0])}
                {item.badge?.()}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User block */}
      <div className={styles.userMenuWrapper}>
        <DashboardUserMenu />
      </div>
    </aside>
  );
}
