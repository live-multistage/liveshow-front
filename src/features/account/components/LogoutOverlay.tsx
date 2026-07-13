'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import styles from './LogoutOverlay.module.scss';

export function LogoutOverlay() {
  const t = useTranslations('nav');

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <Loader2 size={22} className={styles.spinner} aria-hidden />
      <span className={styles.label}>{t('loggingOut')}</span>
    </div>
  );
}
