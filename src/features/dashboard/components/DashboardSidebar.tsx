'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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
      <Link href="/" className={styles.logoLink}>
        <Image src="/logo-white.svg" alt="Liveshow" width={120} height={36} priority />
      </Link>
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={16} className={styles.navIcon} />
              {t(item.navKey as Parameters<typeof t>[0])}
            </Link>
          );
        })}
      </nav>
      <div className={styles.userMenuWrapper}>
        <DashboardUserMenu />
      </div>
    </aside>
  );
}
