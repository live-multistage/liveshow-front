'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/features/account/schemas/login.schema';
import { useDockLoginMutation } from '../hooks/use-dock-login.mutation';
import styles from './DockLoginScreen.module.scss';

export function DockLoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
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
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.eyebrow}>ACESSO · TRANSMISSÃO</div>
        <h2 className={styles.title}>Entrar no Studio</h2>
        <p className={styles.subtitle}>Console de transmissão para produtores e organizações.</p>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="dock-email" className={styles.label}>E-MAIL DE TRABALHO</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
              </svg>
              <input
                id="dock-email"
                type="email"
                disabled={isPending}
                autoComplete="email"
                placeholder="voce@organizacao.com"
                className={styles.input}
                {...register('email')}
              />
            </div>
            {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="dock-password" className={styles.label}>SENHA</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                id="dock-password"
                type={showPassword ? 'text' : 'password'}
                disabled={isPending}
                autoComplete="current-password"
                placeholder="Sua senha"
                className={`${styles.input} ${styles.inputPassword}`}
                {...register('password')}
              />
              <button
                type="button"
                className={styles.pwdToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
            {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}
          </div>

          <label className={styles.rememberRow}>
            <input type="checkbox" className={styles.checkboxInput} {...register('rememberMe')} />
            <span className={styles.checkboxBox}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            Manter esta estação confiável por 30 dias
          </label>

          {error && <p className={styles.errorBanner}>{error.message}</p>}

          <button type="submit" disabled={isPending} className={styles.submit}>
            {isPending ? 'Entrando...' : 'Acessar o Studio'}
            {!isPending && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
