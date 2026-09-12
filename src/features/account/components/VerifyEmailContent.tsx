'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useVerifyEmailMutation } from '../mutations/use-verify-email.mutation';
import styles from './VerifyEmailContent.module.scss';

interface VerifyEmailContentProps {
  token?: string;
}

type VerifyState = 'verifying' | 'success' | 'invalid';

export function VerifyEmailContent({ token }: VerifyEmailContentProps) {
  const t = useTranslations('auth.verifyEmail');
  const { mutate } = useVerifyEmailMutation();
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'invalid');
  // Effects run twice under React Strict Mode in dev — guard against
  // verifying (and consuming) the token twice.
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;
    mutate(
      { token },
      {
        onSuccess: () => setState('success'),
        onError: () => setState('invalid'),
      },
    );
  }, [token, mutate]);

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{t('title')}</h1>

      {state === 'verifying' && <p className={styles.message}>{t('verifying')}</p>}

      {state === 'success' && (
        <>
          <p className={styles.message}>{t('success')}</p>
          <Link href="/login" className={styles.link}>{t('goToLogin')}</Link>
        </>
      )}

      {state === 'invalid' && (
        <>
          <p className={styles.errorMessage}>{t('invalid')}</p>
          <Link href="/login" className={styles.link}>{t('goToLogin')}</Link>
        </>
      )}
    </div>
  );
}
