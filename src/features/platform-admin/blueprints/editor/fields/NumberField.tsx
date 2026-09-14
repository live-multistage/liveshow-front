'use client';

import { Input } from '@live-show/design-system';
import styles from '../Inspector.module.scss';

interface Props {
  id: string;
  label: string;
  value?: number;
  min?: number;
  max?: number;
  onChange(value: number | undefined): void;
}

// "Timeout (ms)" and any other bounded numeric config field.
export function NumberField({ id, label, value, min, max, onChange }: Props) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
      {(min !== undefined || max !== undefined) && (
        <p className={styles.help}>{min ?? '–'}–{max ?? '–'}</p>
      )}
    </div>
  );
}
