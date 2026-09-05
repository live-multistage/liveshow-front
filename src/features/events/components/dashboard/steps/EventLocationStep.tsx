import { useTranslations } from 'next-intl';
import { Controller, useWatch } from 'react-hook-form';
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
  const startsAt = useWatch({ control, name: 'startsAt' });

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
          <Controller
            control={control}
            name="startsAt"
            render={({ field }) => (
              <DateTimePicker
                value={field.value}
                onChange={field.onChange}
                error={errors.startsAt?.message}
                label={t('startsAtLabel')}
                required
              />
            )}
          />
        </div>
        <div className={styles.field}>
          <Controller
            control={control}
            name="endsAt"
            render={({ field }) => (
              <DateTimePicker
                value={field.value}
                onChange={field.onChange}
                error={errors.endsAt?.message}
                min={startsAt}
                label={t('endsAtLabel')}
                required
              />
            )}
          />
        </div>
      </div>
    </section>
  );
}
