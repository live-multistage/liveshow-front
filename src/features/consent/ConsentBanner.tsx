'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAnalyticsConsent, type ConsentState } from '@/lib/analytics/consent';
import { privacyService } from './privacy.service';
import styles from './ConsentBanner.module.scss';

// LGPD consent gate. Renders only until the visitor decides. Accept and Reject
// carry equal visual weight — refusing must be as easy as accepting.
export function ConsentBanner() {
  const t = useTranslations('consent');
  const { consent, setConsent } = useAnalyticsConsent();

  const choose = (state: ConsentState) => {
    setConsent(state);
    privacyService.syncConsent(state === 'granted');
  };

  if (consent !== null) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label={t('title')}>
      <div className={styles.text}>
        <strong className={styles.title}>{t('title')}</strong>
        <span className={styles.body}>
          {t('body')}{' '}
          <Link href="/settings#privacidade" className={styles.link}>{t('settingsLink')}</Link>.
        </span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.reject} onClick={() => choose('denied')}>
          {t('reject')}
        </button>
        <button type="button" className={styles.accept} onClick={() => choose('granted')}>
          {t('accept')}
        </button>
      </div>
    </div>
  );
}
