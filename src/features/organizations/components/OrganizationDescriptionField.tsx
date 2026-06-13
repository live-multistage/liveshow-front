'use client';

import type { UseFormRegisterReturn, FieldError } from 'react-hook-form';
import styles from './OrganizationDescriptionField.module.scss';

interface Props {
  registration: UseFormRegisterReturn;
  error?: FieldError;
}

export function OrganizationDescriptionField({ registration, error }: Props) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>Descrição</label>
      <textarea
        {...registration}
        className={`${styles.textarea} ${error ? styles.textareaError : ''}`}
        placeholder="Descreva sua organização..."
        rows={3}
      />
      {error && <p className={styles.error}>{error.message}</p>}
    </div>
  );
}
