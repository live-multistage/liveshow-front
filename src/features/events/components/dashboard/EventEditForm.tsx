'use client';

import { z } from 'zod';
import { Controller, useWatch } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Checkbox, SimpleCustomSelect } from '@live-show/design-system';
import { SLUG_PATTERN, SLUG_MIN_LENGTH, SLUG_MAX_LENGTH, publicOrigin } from '../../utils/slug';
import styles from './EventDashboardDetailContent.module.scss';

export const editSchema = z.object({
  // Mirrors UpdateEventDto in live-show-orchestrator; uniqueness is the one rule
  // only the server can check, and it comes back as a 409 handled by the caller.
  slug: z
    .string()
    .min(SLUG_MIN_LENGTH, 'Mínimo 3 caracteres')
    .max(SLUG_MAX_LENGTH, 'Máximo 120 caracteres')
    .regex(SLUG_PATTERN, 'Use apenas letras minúsculas, números e hífens'),
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().min(10, 'Mínimo 10 caracteres'),
  startsAt: z.string().min(1, 'Obrigatório'),
  endsAt: z.string().min(1, 'Obrigatório'),
  latencyMode: z.enum(['STANDARD', 'LOW']),
  publiclyFunded: z.boolean().default(false),
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
  /** Server-side slug rejection (409) — only the backend can detect it. */
  slugError?: string;
  // FINISHED events: schedule is historical record — fields render disabled
  // and the container omits them from the update payload.
  scheduleLocked?: boolean;
}

export function EventEditForm({ register, control, errors, errorMessage, slugError, scheduleLocked = false }: Props) {
  const t = useTranslations('eventDetail');
  const slug = useWatch({ control, name: 'slug' });

  return (
    <div className={styles.editForm}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="editSlug">{t('editSlug')}</label>
        <input
          id="editSlug"
          {...register('slug')}
          className={`${styles.input} ${errors.slug || slugError ? styles.inputError : ''}`}
        />
        <p className={styles.slugPreview} data-testid="slug-preview">
          {publicOrigin()}/events/{slug ?? ''}
        </p>
        {(errors.slug || slugError) && (
          <p className={styles.error}>{errors.slug?.message ?? slugError}</p>
        )}
        <p className={styles.slugHint}>{t('editSlugHint')}</p>
      </div>

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
            disabled={scheduleLocked}
            className={`${styles.input} ${errors.startsAt ? styles.inputError : ''}`}
          />
          {errors.startsAt && <p className={styles.error}>{errors.startsAt.message}</p>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('editEndsAt')}</label>
          <input
            type="datetime-local"
            {...register('endsAt')}
            disabled={scheduleLocked}
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
              disabled={scheduleLocked}
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


      {errorMessage && <p className={styles.globalError}>{errorMessage}</p>}
    </div>
  );
}
