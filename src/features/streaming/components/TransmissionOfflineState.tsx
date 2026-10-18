'use client';

import { useTranslations } from 'next-intl';
import styles from './TransmissionOfflineState.module.scss';

// Full-stage state for a granted transmission that is not on air yet.
export function TransmissionOfflineState({ title }: { title: string }) {
  const t = useTranslations('player');
  return (
    <div className={styles.root} role="status">
      <span className={styles.eyebrow}>{t('transmissionOffline')}</span>
      <h2 className={styles.title}>{t('transmissionNotStartedTitle')}</h2>
      <p className={styles.body}>{t('transmissionNotStartedBody', { title })}</p>
    </div>
  );
}
