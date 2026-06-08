'use client';

import { ChevronDown, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
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
import { ROLE_LABEL } from '../types/dashboard.types';
import type { UserRole } from '@/types';
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
  const { user, logout } = useAuth();

  if (!user) return null;

  const role = user.role as Exclude<UserRole, 'USER'>;

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
              <span className={styles.role}>{ROLE_LABEL[role]}</span>
            </div>
          </div>
          <ChevronDown size={12} className={styles.chevron} />
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
            Minha Conta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className={styles.separator} />
        <DropdownMenuItem onClick={logout} className={styles.logoutItem}>
          <LogOut size={14} style={{ marginRight: '0.5rem' }} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
