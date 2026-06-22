'use client';

import { ChevronUp, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import styles from './DashboardUserMenu.module.scss';

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function DashboardUserMenu() {
  const t = useTranslations('dashboard');
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={styles.trigger}>
          <div className={styles.left}>
            <Avatar className={styles.avatar}>
              <AvatarFallback className={styles.avatarFallback}>
                {getInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className={styles.info}>
              <span className={styles.name}>{user.displayName}</span>
              <span className={styles.email}>{user.email}</span>
            </div>
          </div>
          <ChevronUp size={12} className={styles.chevron} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className={styles.dropdownContent}>
        <DropdownMenuLabel className={styles.dropdownLabel}>
          <p className={styles.dropdownName}>{user.displayName}</p>
          <p className={styles.dropdownEmail}>{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={styles.separator} />
        <DropdownMenuItem asChild className={styles.dropdownItem}>
          <Link href="/account">
            <Settings size={14} style={{ marginRight: '0.5rem' }} />
            {t('userMenu.account')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className={styles.separator} />
        <DropdownMenuItem onClick={logout} className={styles.logoutItem}>
          <LogOut size={14} style={{ marginRight: '0.5rem' }} />
          {t('userMenu.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
