import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
}

export function EventLocationStep({ register, errors }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>Nome do Local / Venue</label>
        <input
          {...register('venue')}
          className={styles.input}
          placeholder="Ex: Estádio do Maracanã"
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Cidade</label>
          <input
            {...register('city')}
            className={styles.input}
            placeholder="Ex: Rio de Janeiro"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>País</label>
          <input
            {...register('country')}
            className={styles.input}
            placeholder="Ex: Brasil"
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Início *</label>
          <input
            type="datetime-local"
            {...register('startsAt')}
            className={`${styles.input} ${errors.startsAt ? styles.inputError : ''}`}
          />
          {errors.startsAt && <p className={styles.error}>{errors.startsAt.message}</p>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Fim *</label>
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
