import { useTranslations } from 'next-intl';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { OrganizationResponse } from '@/features/organizations/types/organization.types';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
  orgs: OrganizationResponse[];
}

export function EventInfoStep({ register, errors, orgs }: Props) {
  const t = useTranslations('createEvent.info');

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
        <label className={styles.label}>{t('descLabel')}</label>
        <textarea
          {...register('description')}
          className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
          placeholder={t('descPlaceholder')}
          rows={4}
        />
        {errors.description && <p className={styles.error}>{errors.description.message}</p>}
      </div>
    </section>
  );
}
