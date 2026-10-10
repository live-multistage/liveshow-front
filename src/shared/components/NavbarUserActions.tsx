'use client';

// The signed-in half of the Navbar (notifications, avatar menu). Split out so
// Navbar can load it with next/dynamic: anonymous visitors (most public
// traffic) then never download the Radix menu/popover code it needs.
import Link from 'next/link';
import { Ticket, User, LogOut, Settings, LayoutGrid, LibraryBig, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@live-show/design-system';
import { useTranslations } from 'next-intl';
import type { AuthUser } from '@/features/account';
import { NotificationsDropdown } from '@/features/notifications/components/NotificationsDropdown';
import styles from './Navbar.module.scss';

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

interface Props {
  user: AuthUser | null;
  canAccessDashboard: boolean;
  logout: () => void;
}

export function NavbarUserActions({ user, canAccessDashboard, logout }: Props) {
  const t = useTranslations('nav');

  return (
    <>
      {canAccessDashboard && (
        <Link href="/dashboard" className={styles.iconBtn} aria-label="Dashboard">
          <LayoutGrid size={19} />
        </Link>
      )}

      <span className={styles.hideMobile}>
        <NotificationsDropdown />
      </span>

      <Link href="/tickets" className={styles.ticketsBtn}>
        <Ticket size={15} />
        {t('tickets')}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={styles.avatarBtn}>
            <Avatar className={styles.avatar}>
              <AvatarFallback className={styles.avatarFallback}>
                {user ? getInitials(user.displayName) : <User size={14} />}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={styles.dropdownContent}>
          <DropdownMenuLabel className={styles.dropdownLabel}>
            <p className={styles.dropdownLabelName}>{user?.displayName}</p>
            <p className={styles.dropdownLabelEmail}>{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className={styles.dropdownSeparator} />
          {canAccessDashboard && (
            <DropdownMenuItem asChild className={styles.dropdownItem}>
              <Link href="/dashboard">
                <LayoutGrid size={14} style={{ marginRight: '0.5rem' }} />
                {t('dashboard')}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild className={styles.dropdownItem}>
            <Link href="/account">
              <Settings size={14} style={{ marginRight: '0.5rem' }} />
              {t('account')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={styles.dropdownItem}>
            <Link href="/my-list">
              <LibraryBig size={14} style={{ marginRight: '0.5rem' }} />
              {t('myList')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={styles.dropdownItem}>
            <Link href="/wishlist">
              <Heart size={14} style={{ marginRight: '0.5rem' }} />
              {t('wishlist')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={styles.dropdownItem}>
            <Link href="/tickets">
              <Ticket size={14} style={{ marginRight: '0.5rem' }} />
              {t('myTickets')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className={styles.dropdownSeparator} />
          <DropdownMenuItem onClick={logout} className={styles.dropdownItemDestructive}>
            <LogOut size={14} style={{ marginRight: '0.5rem' }} />
            {t('logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
