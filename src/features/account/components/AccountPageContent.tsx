'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Ticket, ShoppingBag, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import styles from './AccountPageContent.module.scss';

export function AccountPageContent() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const t = useTranslations('account');

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} />
      </div>
    );
  }

  const initials = user?.displayName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? '?';

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.profile}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileInfo}>
            <h1 className={styles.name}>{user?.displayName}</h1>
            <p className={styles.email}>{user?.email}</p>
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('nav.title')}</h2>
          <div className={styles.navList}>
            <button className={styles.navCard} onClick={() => router.push('/tickets')}>
              <Ticket size={20} className={styles.navIcon} />
              <span className={styles.navLabel}>{t('nav.tickets')}</span>
              <ChevronRight size={16} className={styles.navChevron} />
            </button>
            <button className={styles.navCard} onClick={() => router.push('/purchases')}>
              <ShoppingBag size={20} className={styles.navIcon} />
              <span className={styles.navLabel}>{t('nav.purchases')}</span>
              <ChevronRight size={16} className={styles.navChevron} />
            </button>
            <button className={styles.navCard} onClick={() => router.push('/settings')}>
              <Settings size={20} className={styles.navIcon} />
              <span className={styles.navLabel}>{t('nav.settings')}</span>
              <ChevronRight size={16} className={styles.navChevron} />
            </button>
          </div>
        </section>

        <button className={styles.logout} onClick={logout}>
          <LogOut size={16} />
          {t('logout')}
        </button>
      </div>
    </div>
  );
}
