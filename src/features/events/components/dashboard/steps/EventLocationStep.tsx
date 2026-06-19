import { useTranslations } from 'next-intl';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
}

export function EventLocationStep({ register, errors }: Props) {
  const t = useTranslations('createEvent.location');

  return (
    <section className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>{t('venueLabel')}</label>
        <input
          {...register('venue')}
          className={styles.input}
          placeholder={t('venuePlaceholder')}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>{t('cityLabel')}</label>
          <input
            {...register('city')}
            className={styles.input}
            placeholder={t('cityPlaceholder')}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('countryLabel')}</label>
          <input
            {...register('country')}
            className={styles.input}
            placeholder={t('countryPlaceholder')}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>{t('startsAtLabel')}</label>
          <input
            type="datetime-local"
            {...register('startsAt')}
            className={`${styles.input} ${errors.startsAt ? styles.inputError : ''}`}
          />
          {errors.startsAt && <p className={styles.error}>{errors.startsAt.message}</p>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('endsAtLabel')}</label>
          <input
            type="datetime-local"
            {...register('endsAt')}
            className={`${styles.input} ${errors.endsAt ? styles.inputError : ''}`}
          />
          {errors.endsAt && <p className={styles.error}>{errors.endsAt.message}</p>}
        </div>
      </div>
    </section>
  );
}
