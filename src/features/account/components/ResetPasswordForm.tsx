'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas/reset-password.schema';
import { useResetPasswordMutation } from '../mutations/use-reset-password.mutation';
import { Button, Input, Label } from '@live-show/design-system';
import styles from './ResetPasswordForm.module.scss';

interface ResetPasswordFormProps {
  token?: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations('auth.resetPassword');
  // Reused only for the "sign in" CTA after a successful reset — identical
  // wording to the verify-email success screen, so no new i18n key was added.
  const tVerifyEmail = useTranslations('auth.verifyEmail');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? '', password: '', confirmPassword: '' },
  });

  const { mutate, isPending, error } = useResetPasswordMutation();
  const [success, setSuccess] = useState(false);

  function onSubmit(values: ResetPasswordFormValues) {
    mutate({ token: values.token, password: values.password }, { onSuccess: () => setSuccess(true) });
  }

  if (!token) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.errorBanner}>{t('errors.TOKEN_INVALID')}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.confirm}>{t('success')}</p>
        <Link href="/login" className={styles.link}>{tVerifyEmail('goToLogin')}</Link>
      </div>
    );
  }

  const serverErrorMessage = error
    ? (error.code === 'TOKEN_INVALID' ? t('errors.TOKEN_INVALID') : t('errors.GENERIC'))
    : null;

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{t('title')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <Label htmlFor="password" className={styles.label}>{t('password')}</Label>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                id="password"
                type="password"
                disabled={isPending}
                autoComplete="new-password"
                className={styles.inputField}
                {...field}
              />
            )}
          />
          {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}
        </div>

        <div className={styles.field}>
          <Label htmlFor="confirmPassword" className={styles.label}>{t('confirmPassword')}</Label>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <Input
                id="confirmPassword"
                type="password"
                disabled={isPending}
                autoComplete="new-password"
                className={styles.inputField}
                {...field}
              />
            )}
          />
          {/* The zod refine's own message isn't localized — show the i18n
              MISMATCH copy instead whenever that specific rule fails. */}
          {errors.confirmPassword && (
            <span className={styles.fieldError}>{t('errors.MISMATCH')}</span>
          )}
        </div>

        {serverErrorMessage && <p className={styles.errorBanner}>{serverErrorMessage}</p>}

        <Button type="submit" disabled={isPending} className={styles.btnSubmit}>
          {t('submit')}
        </Button>
      </form>
    </div>
  );
}
