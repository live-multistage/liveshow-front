'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { emailOnlySchema, type EmailOnlyFormValues } from '../schemas/forgot-password.schema';
import { useForgotPasswordMutation } from '../mutations/use-forgot-password.mutation';
import { Button, Input, Label } from '@live-show/design-system';
import styles from './ForgotPasswordForm.module.scss';

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
  const [sent, setSent] = useState(false);

  function onSubmit(values: EmailOnlyFormValues) {
    mutate({ email: values.email }, { onSuccess: () => setSent(true) });
  }

  if (sent) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.confirm}>{t('sent')}</p>
        <p className={styles.footer}>
          <Link href="/login" className={styles.link}>{t('backToLogin')}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.subtitle}>{t('subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <Label htmlFor="email" className={styles.label}>{t('email')}</Label>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                id="email"
                type="email"
                disabled={isPending}
                autoComplete="email"
                className={styles.inputField}
                {...field}
              />
            )}
          />
          {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
        </div>

        {error && <p className={styles.errorBanner}>{t('errors.GENERIC')}</p>}

        <Button type="submit" disabled={isPending} className={styles.btnSubmit}>
          {t('submit')}
        </Button>
      </form>

      <p className={styles.footer}>
        <Link href="/login" className={styles.link}>{t('backToLogin')}</Link>
      </p>
    </div>
  );
}
