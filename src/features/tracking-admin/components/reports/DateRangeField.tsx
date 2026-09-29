'use client';

import { Calendar } from 'lucide-react';
import { Input } from '@live-show/design-system';
import styles from './ReportsShared.module.scss';

interface Props {
  label: string;
  from: string;
  to: string;
  invalid: boolean;
  errorText?: string;
  onChange: (from: string, to: string) => void;
}

export function DateRangeField({ label, from, to, invalid, errorText, onChange }: Props) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={`${styles.dateRange} ${invalid ? styles.invalid : ''}`}>
        <Calendar size={14} />
        <Input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} />
        <span>–</span>
        <Input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} />
      </div>
      {invalid && errorText && <span className={styles.fieldError}>{errorText}</span>}
    </div>
  );
}
