'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Menu, X, ShoppingCart } from 'lucide-react';
import { Logo } from '@live-show/design-system';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useAuthCheck } from '@/features/account/hooks/use-auth-check';
import { useCartCount } from '@/features/cart/hooks/use-cart-count';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './Navbar.module.scss';

// Still server-rendered for signed-in users; only its chunk is split off, so
// signed-out pages never load the Radix menu/popover it pulls in.
const NavbarUserActions = dynamic(() =>
  import('./NavbarUserActions').then((m) => m.NavbarUserActions),
);

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // Immersive routes render a full-bleed hero the nav floats over: home, the
  // organizers landing page, and the public event detail page (but not its /checkout subroutes).
  const isImmersive = pathname === '/' || pathname === '/be-partner' || /^\/events\/[^/]+$/.test(pathname);

  useEffect(() => {
    if (!isImmersive) { setScrolled(false); return; }
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isImmersive]);
  // isLoading intentionally not gated on here: isLoggedIn is already correct
  // from the very first server-rendered paint (see AuthProvider's SSR seed),
  // so waiting on isLoading before rendering the real nav actions would just
  // reintroduce the "Loading" placeholder flash this was meant to remove.
  const { user, isLoggedIn, logout } = useAuth();
  const { data: dashboardCheck } = useAuthCheck('access_dashboard', {}, { enabled: isLoggedIn });
  const canAccessDashboard = dashboardCheck?.allowed === true;

  const cartCount = useCartCount();
  const t = useTranslations('nav');

  // Immersive routes only: the nav floats transparent over the hero and never
  // reserves flow space (position: fixed for the page's whole lifetime —
  // switching fixed↔sticky exactly at the scroll threshold would jump the
  // layout by the nav's own height right as the class toggles). Background/
  // blur/border alone respond to scroll. Every other page keeps the
  // sticky+solid bar.
  const navClassName = [
    styles.nav,
    isImmersive && styles.navFixed,
    (!isImmersive || scrolled) && styles.navSolid,
  ].filter(Boolean).join(' ');

  return (
    <nav className={navClassName}>
      <div className={styles.navInner}>
        <div className={styles.leftSection}>
          <Link href="/" className={styles.logo}>
            <Logo size={22} wordmarkClassName={styles.logoText} color="#ff2e9e" />
          </Link>

          <div className={styles.desktopNav}>
            <Link href="/" className={styles.navLink}>{t('home')}</Link>
            <Link href="/events" className={styles.navLink}>{t('schedule')}</Link>
            <Link href="/artists" className={styles.navLink}>{t('artists')}</Link>

            {isLoggedIn && (
              <>
                <Link href="/my-list" className={styles.navLink}>{t('myList')}</Link>
                <Link href="/wishlist" className={styles.navLink}>{t('wishlist')}</Link>
              </>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          {isLoggedIn ? (
            <NavbarUserActions user={user} canAccessDashboard={canAccessDashboard} logout={logout} />
          ) : (
            <>
              <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className={styles.loginLink}>{t('login')}</Link>
              <Link href={`/register?redirect=${encodeURIComponent(pathname)}`} className={styles.registerBtn}>{t('register')}</Link>
            </>
          )}

          <span className={styles.hideMobile}>
            <LanguageSwitcher />
          </span>

          <Link href="/cart" className={styles.cartBtn} aria-label={t('cart')}>
            <ShoppingCart size={19} />
            {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={styles.menuToggle}
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <Link href="/" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('home')}</Link>
          <Link href="/events" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('schedule')}</Link>
          <Link href="/artists" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('artists')}</Link>
          <Link href="/help" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('help')}</Link>
          {/* Language switcher lives here on phones (hidden from the bar). */}
          <div className={styles.mobileLang}>
            <LanguageSwitcher />
          </div>
          {isLoggedIn ? (
            <>
              <Link href="/my-list" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('myList')}</Link>
              <Link href="/wishlist" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('wishlist')}</Link>
              <Link href="/tickets" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('tickets')}</Link>
              {canAccessDashboard && (
                <Link href="/dashboard" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('dashboard')}</Link>
              )}
              <Link href="/account" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('account')}</Link>
              <button onClick={() => { logout(); setMenuOpen(false); }} className={styles.mobileLogout}>{t('logout')}</button>
            </>
          ) : (
            <>
              <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>{t('login')}</Link>
              <Link href={`/register?redirect=${encodeURIComponent(pathname)}`} className={styles.mobileRegister} onClick={() => setMenuOpen(false)}>{t('register')}</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
