'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@live-show/design-system';
import { useVerifyEmailMutation } from '../mutations/use-verify-email.mutation';
import { useResendVerificationMutation } from '../mutations/use-resend-verification.mutation';
import { EmailStatusCard } from './EmailStatusCard';
import styles from './VerifyEmailContent.module.scss';

interface VerifyEmailContentProps {
  token?: string;
}

type VerifyState = 'verifying' | 'success' | 'invalid';

// ponytail: shape check only — the backend is the real validator (and always answers 202).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function VerifyEmailContent({ token }: VerifyEmailContentProps) {
  const t = useTranslations('auth.verifyEmail');
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'invalid');
  const [resendOpen, setResendOpen] = useState(false);
  // Effects run twice under React Strict Mode in dev — guard against
  // verifying (and consuming) the token twice.
  const calledRef = useRef(false);
  const { mutate } = useVerifyEmailMutation({
    onSuccess: () => setState('success'),
    onError: () => setState('invalid'),
  });

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;
    mutate({ token });
  }, [token, mutate]);

  if (state === 'verifying') {
    return (
      <EmailStatusCard
        variant="loading"
        eyebrow={t('loading.eyebrow')}
        title={t('loading.title')}
        message={t('loading.message')}
        iconLabel={t('loading.spinnerLabel')}
        primaryAction={{ label: t('loading.action'), disabled: true }}
        protectedLabel={t('protectedBadge')}
      />
    );
  }

  // Verifying by token alone never tells us the address, so success shows no
  // email pill; and it creates no session, hence "sign in" rather than "go to app".
  if (state === 'success') {
    return (
      <EmailStatusCard
        variant="success"
        eyebrow={t('success.eyebrow')}
        title={t('success.title')}
        message={t('success.message')}
        primaryAction={{ label: t('success.primary'), href: '/login' }}
        secondaryAction={{ label: t('success.secondary'), href: '/' }}
        protectedLabel={t('protectedBadge')}
      />
    );
  }

  return (
    <EmailStatusCard
      variant="expired"
      eyebrow={t('expired.eyebrow')}
      title={t('expired.title')}
      message={t('expired.message')}
      primaryAction={resendOpen ? undefined : { label: t('expired.primary'), onClick: () => setResendOpen(true) }}
      secondaryAction={{ label: t('expired.secondary'), href: '/login' }}
      protectedLabel={t('protectedBadge')}
      footer={(
        <p>
          {t('expired.footer')}{' '}
          <Link href="/login">
            {t('expired.footerLink')}
            <span aria-hidden="true"> →</span>
          </Link>
        </p>
      )}
    >
      {resendOpen && <ResendConfirmationForm />}
    </EmailStatusCard>
  );
}

function ResendConfirmationForm() {
  const t = useTranslations('auth.verifyEmail');
  const tRegister = useTranslations('auth.register');
  const tGeneric = useTranslations('auth.forgotPassword');
  const resend = useResendVerificationMutation();
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [resent, setResent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    resend.mutate({ email: trimmed }, { onSuccess: () => setResent(true) });
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <Label htmlFor="resend-email" className={styles.label}>{t('expired.emailLabel')}</Label>
      <Input
        id="resend-email"
        type="email"
        autoComplete="email"
        // The field only appears after the user asks for it, so moving focus
        // there is the expected next step, not a surprise.
        autoFocus
        placeholder={t('expired.emailPlaceholder')}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={resend.isPending || resent}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? 'resend-email-error' : undefined}
        className={styles.input}
      />
      {invalid && (
        <p id="resend-email-error" className={styles.error} role="alert">{t('expired.invalidEmail')}</p>
      )}

      <Button type="submit" className={styles.submit} disabled={resend.isPending || resent}>
        {t('expired.submit')}
      </Button>

      {resent && <p className={styles.confirm} role="status">{tRegister('checkEmail.resent')}</p>}
      {resend.isError && <p className={styles.error} role="alert">{tGeneric('errors.GENERIC')}</p>}
    </form>
  );
}
