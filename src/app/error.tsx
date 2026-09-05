'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { reportError } from '@/lib/error-reporting';
import styles from './error.module.scss';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error');
  // Not every error reaching this boundary carries one — only failures that
  // came back from our API with a body (see AppError.requestId in
  // src/lib/http/errors.ts). Render errors, chunk load failures, etc. won't.
  //
  // `requestId` is set by our own code before throwing, so it only survives
  // for client-side errors — Next strips custom properties off an Error
  // thrown during server rendering before it reaches this boundary. For that
  // case fall back to `error.digest`, the id Next itself attaches and keeps
  // through serialization; it won't match our API logs, but it's still a
  // stable id the user can hand support to look up server logs.
  const requestId = (error as Error & { requestId?: string }).requestId;
  const displayId = requestId ?? error.digest;

  useEffect(() => {
    reportError(error, requestId ? { requestId } : undefined);
  }, [error, requestId]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.message}>{error.message}</p>
        {displayId ? <p className={styles.requestId}>{t('requestId', { id: displayId })}</p> : null}
        <button onClick={reset} className={styles.btn}>{t('retry')}</button>
      </div>
    </div>
  );
}
