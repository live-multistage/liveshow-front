'use client';

import { z } from 'zod';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import styles from './EventDashboardDetailContent.module.scss';

export const editSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  startsAt: z.string().min(1, 'Obrigatório'),
  endsAt: z.string().min(1, 'Obrigatório'),
}).refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
  message: 'Fim deve ser após o início',
  path: ['endsAt'],
});

export type EditFormValues = z.infer<typeof editSchema>;

interface Props {
  register: UseFormRegister<EditFormValues>;
  errors: FieldErrors<EditFormValues>;
  isPending: boolean;
  errorMessage?: string;
}

export function EventEditForm({ register, errors, errorMessage }: Props) {
  const t = useTranslations('eventDetail');

  return (
    <div className={styles.editForm}>
      <div className={styles.field}>
        <label className={styles.label}>{t('editTitle')}</label>
        <input
          {...register('title')}
          className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
        />
        {errors.title && <p className={styles.error}>{errors.title.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('editDescription')}</label>
        <textarea
          {...register('description')}
          rows={4}
          className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
        />
        {errors.description && <p className={styles.error}>{errors.description.message}</p>}
      </div>

      <div className={styles.editRow}>
        <div className={styles.field}>
          <label className={styles.label}>{t('editStartsAt')}</label>
          <input
            type="datetime-local"
            {...register('startsAt')}
            className={`${styles.input} ${errors.startsAt ? styles.inputError : ''}`}
          />
          {errors.startsAt && <p className={styles.error}>{errors.startsAt.message}</p>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('editEndsAt')}</label>
          <input
            type="datetime-local"
            {...register('endsAt')}
            className={`${styles.input} ${errors.endsAt ? styles.inputError : ''}`}
          />
          {errors.endsAt && <p className={styles.error}>{errors.endsAt.message}</p>}
        </div>
      </div>

      {errorMessage && <p className={styles.globalError}>{errorMessage}</p>}
    </div>
  );
}
