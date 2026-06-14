'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Ticket, Menu, X, Search, User, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { useAuth, useAuthCheck } from '@/features/account';
import { NotificationsDropdown } from '@/features/notifications';
import styles from './Navbar.module.scss';

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const { data: dashboardCheck } = useAuthCheck('access_dashboard', {}, { enabled: isLoggedIn });
  const canAccessDashboard = dashboardCheck?.allowed === true;

  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <Image src="/logo-white.svg" alt="Liveshow" width={110} height={32} priority />
        </Link>

        {/* Desktop Nav */}
        <div className={styles.desktopNav}>
          <Link href="/" className={styles.navLink}>Início</Link>
          <Link href="/events" className={styles.navLink}>Programação</Link>
          {isLoggedIn && (
            <Link href="/tickets" className={styles.navLink}>Ingressos</Link>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {searchOpen ? (
            <div className={styles.searchBox}>
              <Search size={14} color="#71717A" />
              <input
                autoFocus
                className={styles.searchInput}
                placeholder="Buscar shows..."
                onBlur={() => setSearchOpen(false)}
              />
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className={styles.iconBtn}>
              <Search size={16} />
            </button>
          )}

          {!isLoading && (
            <>
              {isLoggedIn ? (
                <>
                  {canAccessDashboard && (
                    <Link href="/dashboard" className={styles.iconBtn} aria-label="Dashboard">
                      <LayoutDashboard size={16} />
                    </Link>
                  )}

                  <NotificationsDropdown />

                  <Link href="/tickets" className={styles.ticketsBtn}>
                    <Ticket size={14} />
                    Ingressos
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={styles.avatarBtn}>
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
                            <LayoutDashboard size={14} style={{ marginRight: '0.5rem' }} />
                            Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild className={styles.dropdownItem}>
                        <Link href="/account">
                          <Settings size={14} style={{ marginRight: '0.5rem' }} />
                          Minha Conta
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className={styles.dropdownItem}>
                        <Link href="/tickets">
                          <Ticket size={14} style={{ marginRight: '0.5rem' }} />
                          Meus Ingressos
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className={styles.dropdownSeparator} />
                      <DropdownMenuItem onClick={logout} className={styles.dropdownItemDestructive}>
                        <LogOut size={14} style={{ marginRight: '0.5rem' }} />
                        Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/login" className={styles.loginLink}>Entrar</Link>
                  <Link href="/register" className={styles.registerBtn}>Cadastrar</Link>
                </>
              )}
            </>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuToggle}>
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link href="/" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Início</Link>
          <Link href="/events" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Programação</Link>
          {isLoggedIn ? (
            <>
              <Link href="/tickets" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Ingressos</Link>
              {canAccessDashboard && (
                <Link href="/dashboard" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              )}
              <Link href="/account" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Minha Conta</Link>
              <button onClick={() => { logout(); setMenuOpen(false); }} className={styles.mobileLogout}>Sair</button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Entrar</Link>
              <Link href="/register" className={styles.mobileRegister} onClick={() => setMenuOpen(false)}>Cadastrar</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
