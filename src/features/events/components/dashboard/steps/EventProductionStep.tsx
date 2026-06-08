import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
}

export function EventProductionStep({ register, errors }: Props) {
  return (
    <section className={styles.section}>
      <p className={styles.stepDesc}>
        Defina quantas câmeras estarão disponíveis para o público durante a transmissão.
      </p>
      <div className={styles.fieldNarrow}>
        <label className={styles.label}>Quantidade de Câmeras *</label>
        <input
          type="number"
          min={1}
          max={32}
          {...register('camerasCount')}
          className={`${styles.input} ${errors.camerasCount ? styles.inputError : ''}`}
        />
        {errors.camerasCount && <p className={styles.error}>{errors.camerasCount.message}</p>}
      </div>
    </section>
  );
}
