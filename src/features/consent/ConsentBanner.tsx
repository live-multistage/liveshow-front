'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAnalyticsConsent, type ConsentState } from '@/lib/analytics/consent';
import { useAnalytics } from '@/lib/analytics/tracking';
import { privacyService } from './privacy.service';
import styles from './ConsentBanner.module.scss';

// LGPD consent gate. Renders only until the visitor decides. Accept and Reject
// carry equal visual weight — refusing must be as easy as accepting.
export function ConsentBanner() {
  const t = useTranslations('consent');
  const { consent, setConsent } = useAnalyticsConsent();
  const analytics = useAnalytics();

  const choose = (state: ConsentState) => {
    // A refusal is never tracked — LGPD: no behavioral event, ever, for a
    // `denied` choice. Tracked before setConsent so the `granted` case still
    // lands even though the SDK's queue is only flushed once consent flips.
    if (state === 'granted') analytics.track('consent_decided', { choice: state });
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
