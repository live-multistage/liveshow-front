import { useTranslations } from 'next-intl';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import type { EventFormat } from '../../../types/event.types';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
  format?: EventFormat;
}

export function EventProductionStep({ register, errors, format }: Props) {
  const t = useTranslations('createEvent.production');

  if (format === 'VOD') {
    return (
      <section className={styles.section}>
        <p className={styles.stepDesc}>{t('vodHint')}</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <p className={styles.stepDesc}>{t('hint')}</p>
      <div className={styles.fieldNarrow}>
        <label className={styles.label}>{t('camerasLabel')}</label>
        <input
          type="number"
          min={1}
          max={32}
          {...register('camerasCount')}
          className={`${styles.input} ${errors.camerasCount ? styles.inputError : ''}`}
        />
        {errors.camerasCount && <p className={styles.error}>{errors.camerasCount.message}</p>}
      </div>

      <label className={styles.checkboxRow}>
        <input type="checkbox" {...register('publiclyFunded')} />
        <span className={styles.checkboxText}>
          <strong>{t('publiclyFundedLabel')}</strong>
          <span className={styles.checkboxHint}>{t('publiclyFundedHint')}</span>
        </span>
      </label>
    </section>
  );
}
