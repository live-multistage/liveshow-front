'use client';

import { useTranslations } from 'next-intl';
import styles from './error.module.scss';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('error');
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.message}>{error.message}</p>
        <button onClick={reset} className={styles.btn}>{t('retry')}</button>
      </div>
    </div>
  );
}
