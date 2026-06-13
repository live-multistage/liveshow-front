'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createOrganizationSchema,
  type CreateOrganizationValues,
} from '../schemas/create-organization.schema';
import { OrganizationSlugField } from './OrganizationSlugField';
import { OrganizationDescriptionField } from './OrganizationDescriptionField';
import styles from './OrganizationForm.module.scss';

interface Props {
  defaultValues?: Partial<CreateOrganizationValues>;
  onSubmit: (values: CreateOrganizationValues) => void;
  isPending?: boolean;
  error?: string | null;
  submitLabel?: string;
  organizationId?: string;
  initialSlug?: string;
}

export function OrganizationForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
  submitLabel = 'Salvar',
  organizationId,
  initialSlug,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateOrganizationValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues,
  });

  const onNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setValue('slug', slug);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Nome da Organização *</label>
        <input
          {...register('name', { onChange: (e) => onNameChange(e.target.value) })}
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
          placeholder="Ex: Rock Productions"
        />
        {errors.name && <p className={styles.error}>{errors.name.message}</p>}
      </div>

      <OrganizationSlugField control={control} excludeId={organizationId} initialSlug={initialSlug} />

      <OrganizationDescriptionField
        registration={register('description')}
        error={errors.description}
      />

      {error && <p className={`${styles.error} ${styles.globalError}`}>{error}</p>}

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={isPending}>
          {isPending ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
