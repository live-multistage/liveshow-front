'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterFormValues } from '../schemas/register.schema';
import { useRegisterMutation } from '../mutations/use-register.mutation';
import styles from './RegisterForm.module.scss';

export function RegisterForm() {
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
      <h1 className={styles.title}>Criar conta</h1>
      <p className={styles.subtitle}>Junte-se ao StageLive e assista shows ao vivo de todo o mundo.</p>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>E-mail</label>
          <input
            type="email"
            placeholder="seu@email.com"
            disabled={isPending}
            className={styles.input}
            {...register('email')}
          />
          {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Nome de exibição</label>
          <input
            type="text"
            placeholder="Seu nome"
            disabled={isPending}
            className={styles.input}
            {...register('displayName')}
          />
          {errors.displayName && <span className={styles.fieldError}>{errors.displayName.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Senha</label>
          <input
            type="password"
            placeholder="Mínimo 8 caracteres"
            disabled={isPending}
            className={styles.input}
            {...register('password')}
          />
          {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Confirmar senha</label>
          <input
            type="password"
            placeholder="Repita sua senha"
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
          {isPending ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className={styles.footer}>
        Já tem uma conta?{' '}
        <Link href="/login" className={styles.link}>
          Entrar
        </Link>
      </p>
    </div>
  );
}
