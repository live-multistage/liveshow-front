'use client';

import { useId } from 'react';
import { Input, Textarea } from '@live-show/design-system';
import { LengthCounter } from './LengthCounter';
import common from './SeoCommon.module.scss';

interface Props {
  label: string;
  value: string;
  // Shown while the field is empty: the value it falls back to.
  inherited: string;
  inheritedLabel: string;
  multiline?: boolean;
  max: number;
  range: readonly [number, number];
  error?: string;
  onChange: (value: string) => void;
}

// Title/description override that shows what it inherits while empty.
export function InheritedTextField({ label, value, inherited, inheritedLabel, multiline, max, range, error, onChange }: Props) {
  const id = useId();
  const empty = value === '';
  const length = empty ? inherited.length : value.length;
  return (
    <div className={common.field}>
      <div className={common.labelRow}>
        <label htmlFor={id} className={common.label}>{label}</label>
        <LengthCounter length={length} max={max} range={range} inheritedLabel={empty ? inheritedLabel : undefined} />
      </div>
      {multiline ? (
        <Textarea id={id} rows={3} value={value} placeholder={inherited} error={error} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <>
          <Input id={id} value={value} placeholder={inherited} aria-invalid={error ? true : undefined} onChange={(e) => onChange(e.target.value)} />
          {error && <p role="alert" className={common.error}>{error}</p>}
        </>
      )}
    </div>
  );
}
