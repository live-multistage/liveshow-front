'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/features/account/schemas/login.schema';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { useDockLoginMutation } from '../hooks/use-dock-login.mutation';
// Reuses the marketing site's login form visuals (card, inputs, error
// styling) so the dock doesn't look like an unstyled debug form — just
// without MarketingPanel (a full-page side panel, wrong for a narrow OBS
// dock) and without useLoginMutation (still navigates on success).
import styles from '@/features/account/components/LoginForm.module.scss';

export function DockLoginScreen() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });
  const { mutate, isPending, error } = useDockLoginMutation();

  function onSubmit(payload: LoginFormValues) {
    mutate({ email: payload.email, password: payload.password, rememberMe: payload.rememberMe });
  }

  return (
    <div style={{ padding: 16 }}>
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>Entrar</h2>
        <p className={styles.formSubtitle}>Faça login para transmitir com esta conta.</p>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="dock-email" className={styles.label}>E-mail</Label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 7 10-7" />
              </svg>
              <Input
                id="dock-email"
                type="email"
                disabled={isPending}
                autoComplete="email"
                className={styles.inputField}
                {...register('email')}
              />
            </div>
            {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <Label htmlFor="dock-password" className={styles.label}>Senha</Label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <Input
                id="dock-password"
                type="password"
                disabled={isPending}
                autoComplete="current-password"
                className={styles.inputField}
                {...register('password')}
              />
            </div>
            {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}
          </div>

          {error && <p className={styles.errorBanner}>{error.message}</p>}

          <Button type="submit" disabled={isPending} className={styles.btnSubmit}>
            {isPending ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
