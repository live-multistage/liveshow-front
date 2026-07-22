'use client';

import { z } from 'zod';
import { Controller } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Checkbox, SimpleCustomSelect } from '@live-show/design-system';
import styles from './EventDashboardDetailContent.module.scss';

export const editSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  startsAt: z.string().min(1, 'Obrigatório'),
  endsAt: z.string().min(1, 'Obrigatório'),
  latencyMode: z.enum(['STANDARD', 'LOW']),
  publiclyFunded: z.boolean().default(false),
  isFree: z.boolean().default(false),
}).refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
  message: 'Fim deve ser após o início',
  path: ['endsAt'],
});

export type EditFormValues = z.infer<typeof editSchema>;

interface Props {
  register: UseFormRegister<EditFormValues>;
  control: Control<EditFormValues>;
  errors: FieldErrors<EditFormValues>;
  isPending: boolean;
  errorMessage?: string;
}

export function EventEditForm({ register, control, errors, errorMessage }: Props) {
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

      <div className={styles.field}>
        <label className={styles.label}>{t('editLatencyMode')}</label>
        <Controller
          name="latencyMode"
          control={control}
          render={({ field }) => (
            <SimpleCustomSelect
              value={field.value}
              onValueChange={field.onChange}
              options={[
                { value: 'STANDARD', label: t('latencyStandard') },
                { value: 'LOW', label: t('latencyLow') },
              ]}
            />
          )}
        />
      </div>

      <Controller
        name="publiclyFunded"
        control={control}
        render={({ field }) => (
          <div className={styles.checkboxRow}>
            <Checkbox
              id="editPubliclyFunded"
              checked={!!field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
            <label htmlFor="editPubliclyFunded" className={styles.checkboxText}>
              <strong>{t('publiclyFundedLabel')}</strong>
              <span className={styles.checkboxHint}>{t('publiclyFundedHint')}</span>
            </label>
          </div>
        )}
      />

      <Controller
        name="isFree"
        control={control}
        render={({ field }) => (
          <div className={styles.checkboxRow}>
            <Checkbox
              id="editIsFree"
              checked={!!field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
            <label htmlFor="editIsFree" className={styles.checkboxText}>
              <strong>Evento gratuito</strong>
              <span className={styles.checkboxHint}>
                Acesso livre — desativa os ingressos pagos e cria um “Acesso Gratuito”. Os
                espectadores reivindicam sem pagar.
              </span>
            </label>
          </div>
        )}
      />

      {errorMessage && <p className={styles.globalError}>{errorMessage}</p>}
    </div>
  );
}
