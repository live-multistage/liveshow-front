'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Logo } from '@live-show/design-system';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { emailOnlySchema, type EmailOnlyFormValues } from '../schemas/forgot-password.schema';
import { useForgotPasswordMutation } from '../mutations/use-forgot-password.mutation';
import styles from './ForgotPasswordForm.module.scss';

const STEPS = ['step1', 'step2', 'step3'] as const;

function MailIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailOnlyFormValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: '' },
  });

  const { mutate, isPending, error } = useForgotPasswordMutation();
  // The address the link went to; null while the form is showing.
  const [sentTo, setSentTo] = useState<string | null>(null);

  function onSubmit({ email }: EmailOnlyFormValues) {
    mutate({ email }, { onSuccess: () => setSentTo(email) });
  }

  return (
    <div className={styles.root}>
      <ForgotPasswordAside />

      <div className={styles.formPanel}>
        <div className={styles.topBar}>
          <Link href="/login" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            {t('backToLogin')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className={styles.content}>
          {sentTo ? (
            <SentState email={sentTo} />
          ) : (
            <>
              <p className={styles.eyebrow}>{t('eyebrow')}</p>
              <h2 className={styles.title}>{t('title')}</h2>
              <p className={styles.subtitle}>{t('subtitle')}</p>

              <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
                <div className={styles.field}>
                  <Label htmlFor="email" className={styles.label}>{t('email')}</Label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}><MailIcon size={16} /></span>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field }) => (
                        <Input
                          id="email"
                          type="email"
                          disabled={isPending}
                          autoComplete="email"
                          placeholder={t('emailPlaceholder')}
                          aria-invalid={errors.email ? true : undefined}
                          aria-describedby={errors.email ? 'email-error' : undefined}
                          className={styles.inputField}
                          {...field}
                        />
                      )}
                    />
                  </div>
                  {errors.email && <span id="email-error" className={styles.fieldError}>{errors.email.message}</span>}
                </div>

                {error && <p className={styles.errorBanner} role="alert">{t('errors.GENERIC')}</p>}

                <Button type="submit" disabled={isPending} className={styles.submit}>
                  {t('submit')}
                  <ArrowIcon />
                </Button>
              </form>

              <p className={styles.remembered}>
                {t('remembered')}{' '}
                <Link href="/login" className={styles.link}>{t('backToLogin')}</Link>
              </p>
            </>
          )}
        </div>

        <footer className={styles.bottomBar}>
          <p className={styles.protected}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            {t('protected')}
          </p>
          <nav className={styles.legal}>
            <Link href="/privacidade">{t('privacy')}</Link>
            <Link href="/help">{t('help')}</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}

function ForgotPasswordAside() {
  const t = useTranslations('auth.forgotPassword.aside');

  return (
    <aside className={styles.aside}>
      <div className={styles.glowPink} aria-hidden="true" />
      <div className={styles.glowPurple} aria-hidden="true" />
      <div className={styles.scanlines} aria-hidden="true" />

      <Link href="/" className={styles.logo}>
        <Logo size={22} wordmarkClassName={styles.logoWordmark} />
      </Link>

      <div className={styles.asideBody}>
        <p className={styles.badge}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {t('badge')}
        </p>
        <h1 className={styles.asideTitle}>
          {t.rich('title', { accent: (chunks) => <span className={styles.accent}>{chunks}</span> })}
        </h1>
        <p className={styles.asideDescription}>{t('description')}</p>

        <p className={styles.stepsLabel}><span aria-hidden="true">→ </span>{t('howItWorks')}</p>
        <ol className={styles.steps}>
          {STEPS.map((key, index) => (
            <li key={key} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
              {t(key)}
            </li>
          ))}
        </ol>
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>{t('expiresLabel')}</dt>
          <dd>{t('expiresValue')}</dd>
        </div>
        <div>
          <dt>{t('singleUseLabel')}</dt>
          <dd>{t('singleUseValue')}</dd>
        </div>
      </dl>
    </aside>
  );
}

function SentState({ email }: { email: string }) {
  const t = useTranslations('auth.forgotPassword');
  const resend = useForgotPasswordMutation();
  const [resent, setResent] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // The form this replaces held focus; hand it to the new heading so keyboard
  // and screen-reader users land on the confirmation.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className={styles.sent}>
      <div className={styles.medallion}>
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.medallionIcon}><MailIcon size={38} /></span>
      </div>

      <p className={styles.eyebrow}>{t('sentEyebrow')}</p>
      <h2 ref={titleRef} tabIndex={-1} className={styles.sentTitle}>{t('sentTitle')}</h2>
      <p className={styles.sentMessage} role="status">{t('sent')}</p>

      <p className={styles.emailPill}>
        <MailIcon size={14} />
        <span className={styles.emailText}>{email}</span>
      </p>

      <Link href="/login" className={styles.primaryAction}>
        {t('backToLogin')}
        <ArrowIcon />
      </Link>

      <div className={styles.resendRow}>
        {t('notReceived')}{' '}
        <button
          type="button"
          className={styles.resendButton}
          disabled={resend.isPending}
          onClick={() => resend.mutate({ email }, { onSuccess: () => setResent(true) })}
        >
          {t('resend')}
          <span aria-hidden="true"> →</span>
        </button>
        {resent && <p className={styles.resendNote} role="status">{t('resent')}</p>}
        {resend.error && <p className={styles.resendError} role="alert">{t('errors.GENERIC')}</p>}
      </div>
    </section>
  );
}
