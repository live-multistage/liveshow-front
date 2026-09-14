'use client';

import { Switch } from '@live-show/design-system';
import styles from '../Inspector.module.scss';

interface Props {
  id: string;
  label: string;
  value?: boolean;
  onChange(value: boolean): void;
}

export function BooleanField({ id, label, value, onChange }: Props) {
  return (
    <div className={styles.field}>
      <div className={styles.switchRow}>
        <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
        <Switch id={id} checked={value ?? false} onCheckedChange={onChange} />
      </div>
    </div>
  );
}
