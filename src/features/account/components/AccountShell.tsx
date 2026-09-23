'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { User as UserIcon, Ticket, ShoppingBag, Bell, Lock, Monitor, Check, LogOut, Tv } from 'lucide-react';
import { useUnreadCountQuery } from '@/features/notifications';
import { getMe } from '../queries/get-me';
import { useAuth } from '../hooks/use-auth';
import { initials } from '../utils/initials';
import styles from './AccountShell.module.scss';

const ROLE_KEYS = ['USER', 'ARTIST', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'] as const;

interface Props {
  children: ReactNode;
  /** Highlights the sidebar item that matches the current route. Only
   * "Notificações" is a real route today — the others stay scroll anchors. */
  activeNav?: 'notifications';
  /**
   * true (SettingsPageContent): Perfil/Segurança/Dispositivos scroll to their
   * section on this same page. false (e.g. /account/notifications, which
   * doesn't render those sections): they link to /account#<id> instead.
   */
  sectionScroll: boolean;
}

// Header + sidebar + layout grid shared by every "Minha conta" screen.
// Extracted out of the former monolithic SettingsPageContent.
export function AccountShell({ children, activeNav, sectionScroll }: Props) {
  const t = useTranslations('settings');
  const { logout } = useAuth();
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 60_000 });
  const { data: unreadCount = 0 } = useUnreadCountQuery();

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (isLoading || !me) {
    return <div className={styles.loading}><span className={styles.spinner} /></div>;
  }

  const roleLabel = (ROLE_KEYS as readonly string[]).includes(me.role) ? t(`role${me.role}`) : t('roleUSER');

  const sectionNavItem = (id: 'perfil' | 'seguranca' | 'dispositivos', icon: ReactNode, label: string) =>
    sectionScroll ? (
      <button key={id} className={styles.navItem} onClick={() => scrollTo(id)}>{icon}{label}</button>
    ) : (
      <Link key={id} href={`/account#${id}`} className={styles.navItem}>{icon}{label}</Link>
    );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>MINHA CONTA</div>
        <h1 className={styles.title}>Configurações</h1>
        <div className={styles.subtitle}>Gerencie seu perfil, ingressos e preferências</div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.identityCard}>
            <div className={styles.identityGlow} />
            <div className={styles.identityRow}>
              <span className={styles.identityAvatar}>
                {me.avatarUrl ? <img src={me.avatarUrl} alt="" /> : initials(me.displayName)}
              </span>
              <div className={styles.identityText}>
                <div className={styles.identityName}>{me.displayName}</div>
                <div className={styles.identityEmail}>{me.email}</div>
              </div>
            </div>
            <div className={styles.roleBadge}><Check size={11} />{roleLabel.toUpperCase()}</div>
          </div>

          <nav className={styles.nav}>
            {sectionNavItem('perfil', <UserIcon size={18} />, 'Perfil')}
            <Link href="/tickets" className={styles.navItem}><Ticket size={18} />Meus Ingressos</Link>
            <Link href="/purchases" className={styles.navItem}><ShoppingBag size={18} />Compras</Link>
            <Link href="/account/subscriptions" className={styles.navItem}><Tv size={18} />{t('subscriptionsNav')}</Link>
            <Link
              href="/account/notifications"
              className={`${styles.navItem} ${activeNav === 'notifications' ? styles.navItemActive : ''}`}
            >
              <Bell size={18} />
              Notificações
              {unreadCount > 0 && <span className={styles.navBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </Link>
            {sectionNavItem('seguranca', <Lock size={18} />, 'Segurança')}
            {sectionNavItem('dispositivos', <Monitor size={18} />, 'Dispositivos')}
          </nav>

          <button className={styles.logout} onClick={logout}><LogOut size={16} />Sair da conta</button>
        </aside>

        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
