'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { reportError } from '@/lib/error-reporting';
import styles from './error.module.scss';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('error');
  // Not every error reaching this boundary carries one — only failures that
  // came back from our API with a body (see AppError.requestId in
  // src/lib/http/errors.ts). Render errors, chunk load failures, etc. won't.
  const requestId = (error as Error & { requestId?: string }).requestId;

  useEffect(() => {
    reportError(error, requestId ? { requestId } : undefined);
  }, [error, requestId]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.message}>{error.message}</p>
        {requestId ? <p className={styles.requestId}>{t('requestId', { id: requestId })}</p> : null}
        <button onClick={reset} className={styles.btn}>{t('retry')}</button>
      </div>
    </div>
  );
}
