'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { registerSchema, type RegisterFormValues } from '../schemas/register.schema';
import { useRegisterMutation } from '../mutations/use-register.mutation';
import styles from './RegisterForm.module.scss';

export function RegisterForm() {
  const t = useTranslations('auth.register');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', displayName: '', password: '', confirmPassword: '' },
  });

  const { mutate, isPending, error } = useRegisterMutation();

  function onSubmit(values: RegisterFormValues) {
    const { confirmPassword: _ignored, ...payload } = values;
    mutate(payload);
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.subtitle}>{t('subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>{t('email')}</label>
          <input
            type="email"
            placeholder={t('emailPlaceholder')}
            disabled={isPending}
            className={styles.input}
            {...register('email')}
          />
          {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('displayName')}</label>
          <input
            type="text"
            placeholder={t('displayNamePlaceholder')}
            disabled={isPending}
            className={styles.input}
            {...register('displayName')}
          />
          {errors.displayName && <span className={styles.fieldError}>{errors.displayName.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('password')}</label>
          <input
            type="password"
            placeholder={t('passwordPlaceholder')}
            disabled={isPending}
            className={styles.input}
            {...register('password')}
          />
          {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('confirmPassword')}</label>
          <input
            type="password"
            placeholder={t('confirmPasswordPlaceholder')}
            disabled={isPending}
            className={styles.input}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword.message}</span>}
        </div>

        {error && (
          <p className={styles.errorBanner}>{error.message}</p>
        )}

        <button type="submit" disabled={isPending} className={styles.btnSubmit}>
          {isPending ? t('submitting') : t('submit')}
        </button>
      </form>

      <p className={styles.footer}>
        {t('alreadyHaveAccount')}{' '}
        <Link href="/login" className={styles.link}>
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}
