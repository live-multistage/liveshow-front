import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Controller, useWatch } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control, UseFormSetValue } from 'react-hook-form';
import type { OrganizationResponse } from '@/features/organizations/types/organization.types';
import {
  type CreateEventFormValues,
  LOW_LATENCY_SUGGESTED_CATEGORIES,
} from '../../../schemas/create-event.schema';
import { EVENT_CATEGORIES } from '../../../types/event.types';
import { TagsInput } from '../TagsInput';
import { Checkbox } from '@/shared/components/ui/checkbox';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
  orgs: OrganizationResponse[];
  control: Control<CreateEventFormValues>;
  setValue: UseFormSetValue<CreateEventFormValues>;
}

export function EventInfoStep({ register, errors, orgs, control, setValue }: Props) {
  const t = useTranslations('createEvent.info');

  const category = useWatch({ control, name: 'category' });
  const latencyMode = useWatch({ control, name: 'latencyMode' });
  const isSportCategory = LOW_LATENCY_SUGGESTED_CATEGORIES.includes(category);

  // Auto-suggest LOW latency for real-time-interactive categories (sports),
  // but never override a choice the organizer made by hand: once they touch
  // the latency select, this effect stops steering it.
  const latencyTouched = useRef(false);
  useEffect(() => {
    if (latencyTouched.current) return;
    setValue('latencyMode', isSportCategory ? 'LOW' : 'STANDARD');
  }, [isSportCategory, setValue]);

  return (
    <section className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>{t('orgLabel')}</label>
        <select
          {...register('organizationId')}
          className={`${styles.input} ${errors.organizationId ? styles.inputError : ''}`}
        >
          <option value="">{t('orgPlaceholder')}</option>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        {errors.organizationId && <p className={styles.error}>{errors.organizationId.message}</p>}
        {orgs.length === 0 && (
          <p className={styles.hint}>{t('noOrgs')}</p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('titleLabel')}</label>
        <input
          {...register('title')}
          className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
          placeholder={t('titlePlaceholder')}
        />
        {errors.title && <p className={styles.error}>{errors.title.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('categoryLabel')}</label>
        <select
          {...register('category')}
          className={`${styles.input} ${errors.category ? styles.inputError : ''}`}
        >
          <option value="">{t('categoryPlaceholder')}</option>
          {EVENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
          ))}
        </select>
        {errors.category && <p className={styles.error}>{errors.category.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('formatLabel')}</label>
        <select {...register('format')} className={styles.input}>
          <option value="LIVE">{t('formatLive')}</option>
          <option value="VOD">{t('formatVod')}</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('latencyLabel')}</label>
        <Controller
          control={control}
          name="latencyMode"
          render={({ field }) => (
            <select
              className={styles.input}
              value={field.value}
              onChange={(e) => {
                latencyTouched.current = true;
                field.onChange(e);
              }}
            >
              <option value="STANDARD">{t('latencyStandard')}</option>
              <option value="LOW">{t('latencyLow')}</option>
            </select>
          )}
        />
        {isSportCategory && latencyMode === 'LOW' && (
          <p className={styles.hint}>{t('latencySportHint')}</p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('descLabel')}</label>
        <textarea
          {...register('description')}
          className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
          placeholder={t('descPlaceholder')}
          rows={4}
        />
        {errors.description && <p className={styles.error}>{errors.description.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('tagsLabel')}</label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagsInput value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <Controller
        control={control}
        name="publiclyFunded"
        render={({ field }) => (
          <div className={styles.checkboxRow}>
            <Checkbox
              id="publiclyFunded"
              checked={!!field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
            <label htmlFor="publiclyFunded" className={styles.checkboxText}>
              <strong>{t('publiclyFundedLabel')}</strong>
              <span className={styles.checkboxHint}>{t('publiclyFundedHint')}</span>
            </label>
          </div>
        )}
      />
    </section>
  );
}
