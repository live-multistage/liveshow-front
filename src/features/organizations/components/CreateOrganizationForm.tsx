'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateOrganizationMutation } from '../mutations/create-organization.mutation';
import type { OrganizationResponse } from '../types/organization.types';
import styles from './CreateOrganizationForm.module.scss';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  slug: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSuccess?: (org: OrganizationResponse) => void;
}

export function CreateOrganizationForm({ onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useCreateOrganizationMutation(onSuccess);

  const onNameChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setValue('slug', slug);
  };

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate({ name: v.name, slug: v.slug }))} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Nome da Organização *</label>
        <input
          {...register('name', {
            onChange: (e) => onNameChange(e.target.value),
          })}
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
          placeholder="Ex: Rock Productions"
        />
        {errors.name && <p className={styles.error}>{errors.name.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Slug (URL única) *</label>
        <div className={styles.slugWrapper}>
          <span className={styles.slugPrefix}>@</span>
          <input
            {...register('slug')}
            className={`${styles.input} ${styles.slugInput} ${errors.slug ? styles.inputError : ''}`}
            placeholder="rock-productions"
          />
        </div>
        {errors.slug && <p className={styles.error}>{errors.slug.message}</p>}
      </div>

      {mutation.error && (
        <p className={`${styles.error} ${styles.globalError}`}>{mutation.error.message}</p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Criando...' : 'Criar Organização'}
        </button>
      </div>
    </form>
  );
}
