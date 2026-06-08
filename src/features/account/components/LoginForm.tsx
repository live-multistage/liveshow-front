'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '../schemas/login.schema';
import { useLoginMutation } from '../mutations/use-login.mutation';
import { config } from '@/config';
import styles from './LoginForm.module.scss';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou senha inválidos.',
  USER_BLOCKED: 'Sua conta foi temporariamente suspensa. Entre em contato com o suporte.',
  TOO_MANY_ATTEMPTS: 'Muitas tentativas de login. Tente novamente mais tarde.',
};

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const { mutate, isPending, error } = useLoginMutation(callbackUrl);

  function onSubmit({ rememberMe: _ignored, ...payload }: LoginFormValues) {
    mutate({ email: payload.email, password: payload.password });
  }

  const errorMessage = error
    ? (ERROR_MESSAGES[error.code ?? ''] ?? error.message)
    : null;

  return (
    <div className={styles.card}>
      <p className={styles.brand}>StageLive</p>
      <h1 className={styles.title}>Bem-vindo de volta</h1>
      <p className={styles.subtitle}>Entre na sua conta para continuar</p>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>E-mail</label>
          <input
            type="email"
            placeholder="seu@email.com"
            disabled={isPending}
            autoComplete="email"
            className={styles.input}
            {...register('email')}
          />
          {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Senha</label>
          <input
            type="password"
            placeholder="Sua senha"
            disabled={isPending}
            autoComplete="current-password"
            className={styles.input}
            {...register('password')}
          />
          {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}
        </div>

        <div className={styles.row}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              disabled={isPending}
              className={styles.checkbox}
              {...register('rememberMe')}
            />
            Lembrar de mim
          </label>
          <Link href="/forgot-password" className={styles.link}>
            Esqueceu a senha?
          </Link>
        </div>

        {errorMessage && <p className={styles.errorBanner}>{errorMessage}</p>}

        <button type="submit" disabled={isPending} className={styles.btnSubmit}>
          {isPending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className={styles.divider}>
        <span className={styles.dividerText}>ou continue com</span>
      </div>

      <div className={styles.oauthList}>
        <a href={`${config.apiUrl}/auth/google`} className={styles.oauthBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continuar com Google
        </a>
        <a href={`${config.apiUrl}/auth/apple`} className={styles.oauthBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
          </svg>
          Continuar com Apple
        </a>
      </div>

      <p className={styles.footer}>
        Não tem uma conta?{' '}
        <Link href="/register" className={styles.link}>
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
