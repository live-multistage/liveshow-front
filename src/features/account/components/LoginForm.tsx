'use client';

import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { loginSchema, type LoginFormValues } from '../schemas/login.schema';
import { useLoginMutation } from '../mutations/use-login.mutation';
import { config } from '@/config';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { MarketingPanel } from './MarketingPanel';
import styles from './LoginForm.module.scss';

interface LoginFormProps {
  callbackUrl?: string;
  oauthError?: boolean;
}

export function LoginForm({ callbackUrl, oauthError }: LoginFormProps) {
  const t = useTranslations('auth.login');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const { mutate, isPending, error } = useLoginMutation(callbackUrl);

  function onSubmit(payload: LoginFormValues) {
    mutate({ email: payload.email, password: payload.password, rememberMe: payload.rememberMe });
  }

  const getErrorMessage = (code: string) =>
    ({
      INVALID_CREDENTIALS: t('errors.INVALID_CREDENTIALS'),
      USER_BLOCKED: t('errors.USER_BLOCKED'),
      TOO_MANY_ATTEMPTS: t('errors.TOO_MANY_ATTEMPTS'),
    })[code] ?? undefined;

  const errorMessage = error ? (getErrorMessage(error.code ?? '') ?? error.message) : null;
  const oauthErrorMessage = oauthError ? t('errors.GOOGLE_FAILED') : null;

  return (
    <div className={styles.root}>
      <MarketingPanel />

      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <p className={styles.eyebrow}>ENTRAR · CONTA</p>
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
                  autoComplete="current-password"
                  className={styles.inputField}
                  {...register('password')}
                />
              </div>
              {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}
            </div>

            <div className={styles.row}>
              <div className={styles.checkboxRow}>
                <Controller
                  control={control}
                  name="rememberMe"
                  render={({ field }) => (
                    <Checkbox
                      id="rememberMe"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  )}
                />
                <Label htmlFor="rememberMe" className={styles.checkboxLabel}>
                  {t('rememberMe')}
                </Label>
              </div>
              <Link href="/forgot-password" className={styles.link}>
                {t('forgotPassword')}
              </Link>
            </div>

            {(errorMessage || oauthErrorMessage) && (
              <p className={styles.errorBanner}>{errorMessage ?? oauthErrorMessage}</p>
            )}

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
              <a href={callbackUrl ? `${config.apiUrl}/auth/google?state=${encodeURIComponent(callbackUrl)}` : `${config.apiUrl}/auth/google`}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('continueWithGoogle')}
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
            LOGIN PROTEGIDO POR CRIPTOGRAFIA
          </div>

          <p className={styles.footer}>
            {t('noAccount')}{' '}
            <Link
              href={callbackUrl ? `/register?redirect=${encodeURIComponent(callbackUrl)}` : '/register'}
              className={styles.link}
            >
              {t('signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
