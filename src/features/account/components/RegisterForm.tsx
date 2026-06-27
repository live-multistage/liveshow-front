'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { registerSchema, type RegisterFormValues } from '../schemas/register.schema';
import { useRegisterMutation } from '../mutations/use-register.mutation';
import { config } from '@/config';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { MarketingPanel } from './MarketingPanel';
import styles from './RegisterForm.module.scss';

interface RegisterFormProps {
  callbackUrl?: string;
}

export function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const t = useTranslations('auth.register');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', displayName: '', password: '', confirmPassword: '' },
  });

  const { mutate, isPending, error } = useRegisterMutation(callbackUrl);

  function onSubmit(values: RegisterFormValues) {
    mutate({ email: values.email, displayName: values.displayName, password: values.password });
  }

  return (
    <div className={styles.root}>
      <MarketingPanel />

      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <p className={styles.eyebrow}>CRIAR CONTA · ACESSO</p>
          <h2 className={styles.formTitle}>{t('title')}</h2>
          <p className={styles.formSubtitle}>{t('subtitle')}</p>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.field}>
              <Label htmlFor="email" className={styles.label}>{t('email')}</Label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 7 10-7" />
                </svg>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  disabled={isPending}
                  autoComplete="email"
                  className={styles.inputField}
                  {...register('email')}
                />
              </div>
              {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
            </div>

            <div className={styles.field}>
              <Label htmlFor="displayName" className={styles.label}>{t('displayName')}</Label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <Input
                  id="displayName"
                  type="text"
                  placeholder={t('displayNamePlaceholder')}
                  disabled={isPending}
                  autoComplete="name"
                  className={styles.inputField}
                  {...register('displayName')}
                />
              </div>
              {errors.displayName && <span className={styles.fieldError}>{errors.displayName.message}</span>}
            </div>

            <div className={styles.field}>
              <Label htmlFor="password" className={styles.label}>{t('password')}</Label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  disabled={isPending}
                  autoComplete="new-password"
                  className={styles.inputField}
                  {...register('password')}
                />
              </div>
              {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}
            </div>

            <div className={styles.field}>
              <Label htmlFor="confirmPassword" className={styles.label}>{t('confirmPassword')}</Label>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('confirmPasswordPlaceholder')}
                  disabled={isPending}
                  autoComplete="new-password"
                  className={styles.inputField}
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword.message}</span>}
            </div>

            {error && <p className={styles.errorBanner}>{error.message}</p>}

            <Button
              type="submit"
              disabled={isPending}
              className={styles.btnSubmit}
            >
              {isPending ? t('submitting') : t('submit')}
            </Button>
          </form>

          <div className={styles.divider}>
            <span className={styles.dividerText}>{t('orContinueWith')}</span>
          </div>

          <div className={styles.oauthGrid}>
            <Button variant="outline" className={styles.oauthBtn} asChild>
              <a href={`${config.apiUrl}/auth/google`}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </a>
            </Button>
            <Button variant="outline" className={styles.oauthBtn} asChild>
              <a href={`${config.apiUrl}/auth/apple`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                </svg>
                Apple
              </a>
            </Button>
          </div>

          <div className={styles.securityFooter}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            CADASTRO PROTEGIDO POR CRIPTOGRAFIA
          </div>

          <p className={styles.footer}>
            {t('alreadyHaveAccount')}{' '}
            <Link
              href={callbackUrl ? `/login?redirect=${encodeURIComponent(callbackUrl)}` : '/login'}
              className={styles.link}
            >
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
