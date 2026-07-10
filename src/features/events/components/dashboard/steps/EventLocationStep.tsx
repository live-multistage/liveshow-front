import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import { DateTimePicker } from '@/shared/components/DateTimePicker/DateTimePicker';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
  control: Control<CreateEventFormValues>;
}

export function EventLocationStep({ register, errors, control }: Props) {
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
          <Controller
            control={control}
            name="startsAt"
            render={({ field }) => (
              <DateTimePicker value={field.value} onChange={field.onChange} error={errors.startsAt?.message} />
            )}
          />
          {errors.startsAt && <p className={styles.error}>{errors.startsAt.message}</p>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('endsAtLabel')}</label>
          <Controller
            control={control}
            name="endsAt"
            render={({ field }) => (
              <DateTimePicker value={field.value} onChange={field.onChange} error={errors.endsAt?.message} />
            )}
          />
          {errors.endsAt && <p className={styles.error}>{errors.endsAt.message}</p>}
        </div>
      </div>
    </section>
  );
}
